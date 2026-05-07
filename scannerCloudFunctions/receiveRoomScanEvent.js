import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import admin from "firebase-admin";
import { applyScannerEventAdapter } from "./transitions/applyScannerEventAdapter.js";
import { checkForWaitingPatient } from "./checkForWaitingPatient.js";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = getFirestore();
const SCANNER_SHARED_TOKEN = defineSecret("SCANNER_SHARED_TOKEN");

const ALLOWED_EVENT_TYPES = ["scan_received", "boot_sync"];

export const receiveRoomScanEvent = onRequest(
  { secrets: [SCANNER_SHARED_TOKEN] },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const authHeader = req.headers.authorization || "";
      const token = authHeader.replace("Bearer ", "").trim();

      if (token !== SCANNER_SHARED_TOKEN.value()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const {
        visit_id,
        raw_scan_value,
        room_id,
        station_id,
        device_id,
        event_type,
        device_timestamp_utc,
      } = req.body || {};
      if (event_type === "boot_sync") {
        if (!room_id || !station_id || !device_id || !device_timestamp_utc) {
          return res.status(400).json({
            error: "Missing required boot_sync fields",
          });
        }

        const activeVisitsSnap = await db
          .collection("patients")
          .where("complete", "==", false)
          .limit(250)
          .get();

        let inProcessVisit = null;
        let waitingVisit = null;

        activeVisitsSnap.forEach((doc) => {
          const data = doc.data();
          const plan = Array.isArray(data.plan_of_care)
            ? data.plan_of_care
            : [];

          const stationStep = plan.find((step) => step.station === station_id);

          console.log("BOOT SYNC STATION MATCH:", {
            visit_id: doc.id,
            station_id,
            matched_step: stationStep,
            patient_name:
              data.patient_name || data.name || data.full_name || null,
            location_id: data.location_id || null,
          });

          if (!stationStep) return;

          if (stationStep.status === "in_process" && !inProcessVisit) {
            inProcessVisit = { id: doc.id, data };
          }

          if (stationStep.status === "waiting" && !waitingVisit) {
            waitingVisit = { id: doc.id, data };
          }
        });

        let display;

        if (inProcessVisit) {
          const patientName =
            inProcessVisit.data.patient_name ||
            inProcessVisit.data.name ||
            inProcessVisit.data.full_name ||
            "Paciente";

          display = {
            mode: "room_status",
            updated_at: Date.now(),
            room: { label: room_id },
            station: { label: station_id },
            status: {
              code: "in_process",
              label: "EN\nPROCESO",
            },
            patient: { name: patientName },
            timing: {
              started_at: new Date().toISOString(),
            },
          };
        } else if (waitingVisit) {
          display = {
            mode: "room_status",
            updated_at: Date.now(),
            room: { label: room_id },
            station: { label: station_id },
            status: {
              code: "patient_waiting",
              label: "PACIENTE\nEN ESPERA",
            },
            patient: { name: "—" },
            timing: {
              started_at: null,
            },
          };
        } else {
          display = {
            mode: "room_status",
            updated_at: Date.now(),
            room: { label: room_id },
            station: { label: station_id },
            status: {
              code: "vacant",
              label: "DISPONIBLE",
            },
            patient: { name: "—" },
            timing: {
              started_at: null,
            },
          };
        }

        return res.status(200).json({
          ok: true,
          event_id: null,
          display,
        });
      }
      if (
        !visit_id ||
        !raw_scan_value ||
        !room_id ||
        !station_id ||
        !device_id ||
        !event_type ||
        !device_timestamp_utc
      ) {
        return res.status(400).json({
          error: "Missing required fields",
        });
      }

      if (!ALLOWED_EVENT_TYPES.includes(event_type)) {
        return res.status(400).json({
          error: `Invalid event_type`,
        });
      }

      // =========================
      // STORE EVENT
      // =========================

      const docRef = await db.collection("room_events").add({
        visit_id,
        raw_scan_value,
        room_id,
        station_id,
        device_id,
        event_type,
        device_timestamp_utc,
        processing_status: "processing_by_receiveRoomScanEvent",
        processed_by: "receiveRoomScanEvent",
        received_at: FieldValue.serverTimestamp(),
      });

      // =========================
      // LOAD VISIT
      // =========================

      const visitRef = db.collection("patients").doc(String(visit_id));
      const visitSnap = await visitRef.get();

      let display;

      if (!visitSnap.exists) {
        display = {
          mode: "overlay",
          updated_at: Date.now(),
          overlay: {
            severity: "error",
            title: "Paciente no encontrado",
            detail: visit_id,
          },
        };

        // mark event resolved EVEN on error
        await docRef.set(
          {
            processing_status: "resolved",
            processing_error: "visit_not_found",
            processed_by: "receiveRoomScanEvent",
            processed_at: FieldValue.serverTimestamp(),
            display_response: display,
          },
          { merge: true },
        );

        return res.status(200).json({
          ok: false,
          event_id: docRef.id,
          display,
        });
      }

      const visitData = visitSnap.data();

      // =========================
      // APPLY TRANSITION (KEY FIX)
      // =========================

      const transitionTimestamp = admin.firestore.Timestamp.now();

      const result = applyScannerEventAdapter({
        visitData,
        station: station_id,
        timestamp: transitionTimestamp,
        source: "scanner",
      });

      if (result.changed) {
        await visitRef.update({
          plan_of_care: result.updatedPlanOfCare,
        });
      }

      // =========================
      // BUILD DISPLAY FROM RESULT
      // =========================

      const patientName =
        visitData.patient_name ||
        visitData.name ||
        visitData.full_name ||
        "Paciente";

      if (result.targetStatus === "in_process") {
        // SCAN-IN CASE (unchanged)
        display = {
          mode: "room_status",
          updated_at: Date.now(),
          room: { label: room_id },
          station: { label: station_id },
          status: {
            code: "in_process",
            label: "EN\nPROCESO",
          },
          patient: { name: patientName },
          timing: {
            started_at: new Date().toISOString(),
          },
        };
      } else {
        // 🔥 SCAN-OUT CASE (NEW LOGIC)

        const hasWaitingPatient = await checkForWaitingPatient({
          db,
          station_id,
          location_id: visitData.location_id,
          current_visit_id: visit_id,
        });

        const statusCode = hasWaitingPatient ? "patient_waiting" : "vacant";

        const statusLabel = hasWaitingPatient
          ? "PACIENTE\nEN ESPERA"
          : "DISPONIBLE";

        display = {
          mode: "room_status",
          updated_at: Date.now(),
          room: { label: room_id },
          station: { label: station_id },
          status: {
            code: statusCode,
            label: statusLabel,
          },
          patient: { name: "—" },
          timing: {
            started_at: null,
          },
        };
      }

      // =========================
      // MARK EVENT AS RESOLVED (CRITICAL)
      // =========================

      await docRef.set(
        {
          processing_status: "resolved",
          processing_error: null,
          processed_by: "receiveRoomScanEvent",
          processed_at: FieldValue.serverTimestamp(),
          display_response: display,
        },
        { merge: true },
      );

      // =========================
      // RETURN RESPONSE
      // =========================

      return res.status(200).json({
        ok: true,
        event_id: docRef.id,
        display,
      });
    } catch (err) {
      console.error("Error receiving room scan event:", err);

      return res.status(500).json({
        ok: false,
        error: "Internal server error",
        display: {
          mode: "overlay",
          updated_at: Date.now(),
          overlay: {
            severity: "error",
            title: "Error",
            detail: "No se pudo procesar el escaneo",
          },
        },
      });
    }
  },
);
