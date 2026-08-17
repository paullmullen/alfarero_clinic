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
const scannerSecret = defineSecret("SCANNER_SHARED_SECRET");

const ALLOWED_EVENT_TYPES = ["scan_received", "boot_sync"];

function getPatientName(visitData) {
  return (
    visitData.patient_name ||
    visitData.name ||
    visitData.full_name ||
    "Paciente"
  );
}

function buildRoomStatusDisplay({
  room_id,
  station_id,
  statusCode,
  statusLabel,
  patientName = "—",
  startedAt = null,
}) {
  return {
    mode: "room_status",
    updated_at: Date.now(),
    room: { label: room_id },
    station: { label: station_id },
    status: {
      code: statusCode,
      label: statusLabel,
    },
    patient: { name: patientName },
    timing: {
      started_at: startedAt,
    },
  };
}

async function buildBootSyncDisplay({ room_id, station_id }) {
  const activeVisitsSnap = await db
    .collection("patients")
    .where("complete", "==", false)
    .limit(250)
    .get();

  let inProcessVisit = null;
  let waitingVisit = null;

  activeVisitsSnap.forEach((doc) => {
    const data = doc.data();
    const plan = Array.isArray(data.plan_of_care) ? data.plan_of_care : [];

    const stationStep = plan.find((step) => step.station === station_id);

    if (!stationStep) return;

    console.log("BOOT SYNC STATION MATCH:", {
      visit_id: doc.id,
      station_id,
      matched_step: stationStep,
      patient_name: data.patient_name || data.name || data.full_name || null,
      location_id: data.location_id || null,
    });

    if (stationStep.status === "in_process" && !inProcessVisit) {
      inProcessVisit = { id: doc.id, data, stationStep };
    }

    if (stationStep.status === "waiting" && !waitingVisit) {
      waitingVisit = { id: doc.id, data, stationStep };
    }
  });

  if (inProcessVisit) {
    return buildRoomStatusDisplay({
      room_id,
      station_id,
      statusCode: "in_process",
      statusLabel: "EN\nPROCESO",
      patientName: getPatientName(inProcessVisit.data),
      startedAt: new Date().toISOString(),
    });
  }

  if (waitingVisit) {
    return buildRoomStatusDisplay({
      room_id,
      station_id,
      statusCode: "patient_waiting",
      statusLabel: "PACIENTE\nEN ESPERA",
      patientName: "—",
      startedAt: null,
    });
  }

  return buildRoomStatusDisplay({
    room_id,
    station_id,
    statusCode: "vacant",
    statusLabel: "DISPONIBLE",
    patientName: "—",
    startedAt: null,
  });
}

export const receiveRoomScanEvent = onRequest(
  { secrets: [scannerSecret] },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const authHeader = req.headers.authorization || "";
      const token = authHeader.replace("Bearer ", "").trim();

      if (token !== scannerSecret.value()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const {
        event_id,
        visit_id,
        raw_scan_value,
        room_id,
        station_id,
        device_id,
        event_type,
        device_timestamp_utc,
      } = req.body || {};

      if (!event_type || !ALLOWED_EVENT_TYPES.includes(event_type)) {
        return res.status(400).json({
          error: "Invalid event_type",
        });
      }

      // =========================
      // BOOT / DISPLAY SYNC
      // =========================

      if (event_type === "boot_sync") {
        if (!room_id || !station_id || !device_id || !device_timestamp_utc) {
          return res.status(400).json({
            error: "Missing required boot_sync fields",
          });
        }

        const display = await buildBootSyncDisplay({
          room_id,
          station_id,
        });

        return res.status(200).json({
          ok: true,
          event_id: null,
          duplicate: false,
          display,
        });
      }

      // =========================
      // NORMAL SCAN VALIDATION
      // =========================

      if (
        !event_id ||
        !visit_id ||
        !raw_scan_value ||
        !room_id ||
        !station_id ||
        !device_id ||
        !device_timestamp_utc
      ) {
        return res.status(400).json({
          error: "Missing required fields",
        });
      }

      // =========================
      // IDEMPOTENCY CHECK
      // =========================

      const docRef = db.collection("room_events").doc(String(event_id));
      const existingEventSnap = await docRef.get();

      if (existingEventSnap.exists) {
        const existingEvent = existingEventSnap.data() || {};

        if (existingEvent.display_response) {
          return res.status(200).json({
            ok: existingEvent.ok ?? true,
            event_id: docRef.id,
            duplicate: true,
            display: existingEvent.display_response,
          });
        }

        return res.status(202).json({
          ok: false,
          event_id: docRef.id,
          duplicate: true,
          processing_status: existingEvent.processing_status || "processing",
          error: "Event already received and is still processing",
        });
      }

      // =========================
      // STORE EVENT
      // =========================

      await docRef.create({
        event_id,
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

        await docRef.set(
          {
            ok: false,
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
          duplicate: false,
          display,
        });
      }

      const visitData = visitSnap.data();

      // =========================
      // APPLY TRANSITION
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

      const patientName = getPatientName(visitData);

      if (result.targetStatus === "in_process") {
        display = buildRoomStatusDisplay({
          room_id,
          station_id,
          statusCode: "in_process",
          statusLabel: "EN\nPROCESO",
          patientName,
          startedAt: new Date().toISOString(),
        });
      } else {
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

        display = buildRoomStatusDisplay({
          room_id,
          station_id,
          statusCode,
          statusLabel,
          patientName: "—",
          startedAt: null,
        });
      }

      // =========================
      // MARK EVENT AS RESOLVED
      // =========================

      await docRef.set(
        {
          ok: true,
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
        duplicate: false,
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
