import { onRequest } from "firebase-functions/v2/https";
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const updateStatusChange = onRequest(
  {
    region: "us-central1",
    serviceAccount:
      "sa-functions-runtime@alfarero-478ad.iam.gserviceaccount.com",

    cors: [
      /localhost(:\d+)?$/,
      "https://multimedica.org",
      "https://alfarero-478ad--expire-o4gpaz9l.web.app",
    ],
    methods: ["POST", "OPTIONS"],
  },
  async (req, res) => {
    if (req.method === "OPTIONS") return res.status(204).send("");

    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    try {
      const { patientId, carePlanIndex, newStatus } = req.body;

      if (!patientId || carePlanIndex == null || !newStatus) {
        return res.status(400).json({
          error: "Invalid arguments. Missing required data.",
          got: { patientId, carePlanIndex, newStatus },
        });
      }

      const db = admin.firestore();

      const patientRef = db.collection("patients").doc(patientId);
      const patientDoc = await patientRef.get();

      if (!patientDoc.exists) {
        return res.status(404).json({ error: "Patient not found", patientId });
      }

      const patientData = patientDoc.data();
      if (!patientData) {
        return res.status(404).json({ error: "Patient data is undefined." });
      }

      if (
        !Array.isArray(patientData.plan_of_care) ||
        patientData.plan_of_care.length === 0
      ) {
        return res.status(400).json({
          error: "plan_of_care is not a valid array or is empty.",
        });
      }

      const carePlanEntryIndex = patientData.plan_of_care.findIndex(
        (entry) => entry.station === carePlanIndex,
      );

      if (carePlanEntryIndex === -1) {
        return res.status(400).json({
          error: `No matching station found in plan_of_care for station: ${carePlanIndex}`,
        });
      }

      const currentEntry = patientData.plan_of_care[carePlanEntryIndex];
      const now = admin.firestore.Timestamp.now();

      const updatedEntry = {
        ...currentEntry,
        status: newStatus,
        lastUpdate: now,
      };

      // waiting logic
      if (newStatus === "waiting" && currentEntry.status !== "waiting") {
        updatedEntry.waiting_start = now;
        updatedEntry.waiting_end = null;
        updatedEntry.waiting_time = null;
      } else if (currentEntry.status === "waiting" && newStatus !== "waiting") {
        updatedEntry.waiting_end = now;
        if (updatedEntry.waiting_start && updatedEntry.waiting_end) {
          updatedEntry.waiting_time =
            updatedEntry.waiting_end - updatedEntry.waiting_start;
        }
      }

      // in_process logic
      if (newStatus === "in_process" && currentEntry.status !== "in_process") {
        updatedEntry.in_process_start = now;
        updatedEntry.in_process_end = null;
        updatedEntry.procedure_time = null;
      } else if (
        currentEntry.status === "in_process" &&
        newStatus !== "in_process"
      ) {
        updatedEntry.in_process_end = now;
        if (updatedEntry.in_process_start && updatedEntry.in_process_end) {
          updatedEntry.procedure_time =
            updatedEntry.in_process_end - updatedEntry.in_process_start;
        }
      }

      let updatedPlanOfCare = [...patientData.plan_of_care];
      updatedPlanOfCare[carePlanEntryIndex] = updatedEntry;

      // auto-start next eligible station on complete
      if (newStatus === "complete") {
        const EXCLUDED_STATIONS = new Set(["pha", "lab"]);
        const ELIGIBLE_STATUSES = new Set(["2", "3", "4", "5", "6", "7"]);

        const alreadyActive = updatedPlanOfCare.some((s) =>
          ["waiting", "in_process"].includes(s.status),
        );

        if (!alreadyActive) {
          const nextIndex = updatedPlanOfCare.findIndex((station) => {
            const stationCode = (station.station || "").toLowerCase();
            return (
              ELIGIBLE_STATUSES.has(station.status) &&
              !EXCLUDED_STATIONS.has(stationCode)
            );
          });

          if (nextIndex !== -1) {
            updatedPlanOfCare[nextIndex] = {
              ...updatedPlanOfCare[nextIndex],
              status: "waiting",
              waiting_start: now,
              lastUpdate: now,
            };
          }
        }
      }

      await patientRef.update({ plan_of_care: updatedPlanOfCare });

      return res.status(200).json({ success: true, updatedPlanOfCare });
    } catch (error) {
      console.error("Error updating plan_of_care:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        details: error.message,
      });
    }
  },
);
