import { onRequest } from "firebase-functions/v2/https";
import admin from "firebase-admin";
import { applyManualStatusChangeAdapter } from "./transitions/applyManualStatusChangeAdapter.js";
import { writeStatsIfNeeded } from "./stats/writeStatsIfNeeded.js";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const updateStatusChangeV2 = onRequest(
  {
    region: "us-central1",
    serviceAccount:
      "sa-functions-runtime@alfarero-478ad.iam.gserviceaccount.com",
    cors: [
      /localhost(:\d+)?$/,
      "https://multimedica.org",
      "https://alfarero-478ad--test-712c1z2l.web.app",
    ],
    methods: ["POST", "OPTIONS"],
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    try {
      const { patientId, carePlanIndex, newStatus } = req.body;

      if (!patientId || !carePlanIndex || !newStatus) {
        return res.status(400).json({
          error: "Invalid arguments. Missing required data.",
          got: { patientId, carePlanIndex, newStatus },
        });
      }

      const VALID_STATUSES = new Set([
        "pending",
        "planned",
        "waiting",
        "in_process",
        "obs",
        "complete",
      ]);

      if (!VALID_STATUSES.has(newStatus)) {
        return res.status(400).json({
          error: "Invalid newStatus.",
          allowed: Array.from(VALID_STATUSES),
          got: newStatus,
        });
      }

      const db = admin.firestore();
      const patientRef = db.collection("patients").doc(patientId);
      const patientDoc = await patientRef.get();

      if (!patientDoc.exists) {
        return res.status(404).json({
          error: "Patient not found",
          patientId,
        });
      }

      const patientData = patientDoc.data();

      if (!patientData) {
        return res.status(404).json({
          error: "Patient data is undefined.",
        });
      }

      if (
        !Array.isArray(patientData.plan_of_care) ||
        patientData.plan_of_care.length === 0
      ) {
        return res.status(400).json({
          error: "plan_of_care is not a valid array or is empty.",
        });
      }

      const stationCode = String(carePlanIndex).trim();

      const stationExists = patientData.plan_of_care.some(
        (entry) => entry.station === stationCode,
      );

      if (!stationExists) {
        return res.status(400).json({
          error: `No matching station found in plan_of_care for station: ${stationCode}`,
        });
      }

      const now = admin.firestore.Timestamp.now();

      // 🔥 NEW: use adapter instead of direct engine call
      const result = applyManualStatusChangeAdapter({
        visitData: patientData,
        station: stationCode,
        newStatus,
        timestamp: now,
        source: "manual",
      });

      if (!result.changed) {
        return res.status(200).json({
          success: true,
          changed: false,
          reason: result.reason,
        });
      }

      await patientRef.update({
        plan_of_care: result.updatedPlanOfCare,
        last_update: now,
      });

      // 🔥 NEW: stats integration (same pattern as scanner)
      if (result.encounterClosed && result.encounter?.encounter_id) {
        await writeStatsIfNeeded({
          visitRef: patientRef,
          station: result.statsStation || stationCode,
          encounterId: result.encounter.encounter_id,
        });
      }

      return res.status(200).json({
        success: true,
        changed: true,
        patientId,
        station: stationCode,
        newStatus,
        targetStatus: result.targetStatus,
        promoted: result.promoted,
        promotedStation: result.promotedStation,
        encounterClosed: result.encounterClosed,
        statsStation: result.statsStation,
      });
    } catch (error) {
      console.error("Error updating plan_of_care with V2 engine:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        details: error.message,
      });
    }
  },
);
