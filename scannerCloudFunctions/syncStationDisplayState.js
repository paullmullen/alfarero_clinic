import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const scannerSecret = defineSecret("SCANNER_SHARED_SECRET");

const ACTIVE_PATIENT_SYNC_LIMIT = 150;

const STATION_LABELS_ES = {
  reg: "Registro",
  nur: "Enfermería",
  enf: "Enfermería",
  doc: "Consulta",
  lab: "Laboratorio",
  pha: "Farmacia",
  far: "Farmacia",
  den: "Dental",
  nut: "Nutrición",
  ped: "Pediatría",
  obs: "Observación",
};

function getBearerToken(req) {
  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function normalizeStation(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getStationFromStep(step = {}) {
  return normalizeStation(
    step.station_id ||
      step.station ||
      step.station_type ||
      step.name ||
      step.value,
  );
}

function getStatusFromStep(step = {}) {
  return String(step.status || "")
    .trim()
    .toLowerCase();
}

function getStartedAtFromStep(step = {}) {
  const value =
    step.started_at ||
    step.start_time ||
    step.in_process_started_at ||
    step.updated_at ||
    null;

  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;

  return null;
}

function getPatientName(patient = {}) {
  return (
    patient.patient_name || patient.name || patient.full_name || "Paciente"
  );
}

function buildPollingInstruction({ statusCode, hasActivePatients }) {
  if (statusCode === "in_process") {
    return {
      should_poll: true,
      recommended_interval_ms: 10000,
      reason: "station_in_process",
    };
  }

  if (statusCode === "patient_waiting") {
    return {
      should_poll: true,
      recommended_interval_ms: 10000,
      reason: "patient_waiting",
    };
  }

  if (hasActivePatients) {
    return {
      should_poll: true,
      recommended_interval_ms: 30000,
      reason: "location_active",
    };
  }

  return {
    should_poll: false,
    recommended_interval_ms: null,
    reason: "location_inactive",
  };
}

function buildDisplayPayload({
  roomId,
  stationId,
  statusCode,
  statusLabel,
  patient = null,
  startedAt = null,
}) {
  return {
    mode: "room_status",
    updated_at: Date.now(),
    room: {
      id: roomId || null,
      label: roomId || "—",
    },
    station: {
      id: stationId || null,
      label: STATION_LABELS_ES[stationId] || stationId || "—",
    },
    status: {
      code: statusCode,
      label: statusLabel,
    },
    patient: {
      name: patient ? getPatientName(patient) : "—",
      visit_id: patient?.pt_no || patient?.visit_id || patient?.id || null,
    },
    timing: {
      started_at: startedAt,
    },
  };
}

function buildResponse({ state, statusCode, hasActivePatients }) {
  return {
    ok: true,
    state,
    polling: buildPollingInstruction({
      statusCode,
      hasActivePatients,
    }),
  };
}

export const syncStationDisplayState = onRequest(
  {
    region: "us-central1",
    cors: true,
    secrets: [scannerSecret],
  },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        return res.status(405).json({
          ok: false,
          error: "Use POST",
        });
      }

      const token = getBearerToken(req);
      const expectedSecret = scannerSecret.value();

      if (!expectedSecret || token !== expectedSecret) {
        return res.status(401).json({
          ok: false,
          error: "Unauthorized",
        });
      }

      const { room_id, station_id, location_id } = req.body || {};
      const stationId = normalizeStation(station_id);

      if (!stationId) {
        return res.status(400).json({
          ok: false,
          error: "station_id required",
        });
      }

      let query = db.collection("patients").where("complete", "==", false);

      if (location_id) {
        query = query.where("location_id", "==", location_id);
      }

      const snap = await query.limit(ACTIVE_PATIENT_SYNC_LIMIT).get();
      const hasActivePatients = !snap.empty;

      let inProcessMatch = null;
      let waitingMatch = null;

      for (const doc of snap.docs) {
        const patient = { id: doc.id, ...doc.data() };
        const plan = Array.isArray(patient.plan_of_care)
          ? patient.plan_of_care
          : [];

        for (const step of plan) {
          const stepStation = getStationFromStep(step);
          const stepStatus = getStatusFromStep(step);

          if (stepStation !== stationId) continue;

          if (stepStatus === "in_process") {
            inProcessMatch = {
              patient,
              startedAt: getStartedAtFromStep(step),
            };
            break;
          }

          if (!waitingMatch && stepStatus === "waiting") {
            waitingMatch = { patient };
          }
        }

        if (inProcessMatch) break;
      }

      if (inProcessMatch) {
        const statusCode = "in_process";

        return res.status(200).json(
          buildResponse({
            statusCode,
            hasActivePatients,
            state: buildDisplayPayload({
              roomId: room_id,
              stationId,
              statusCode,
              statusLabel: "EN PROCESO",
              patient: inProcessMatch.patient,
              startedAt: inProcessMatch.startedAt,
            }),
          }),
        );
      }

      if (waitingMatch) {
        const statusCode = "patient_waiting";

        return res.status(200).json(
          buildResponse({
            statusCode,
            hasActivePatients,
            state: buildDisplayPayload({
              roomId: room_id,
              stationId,
              statusCode,
              statusLabel: "PACIENTE EN ESPERA",
              patient: waitingMatch.patient,
            }),
          }),
        );
      }

      const statusCode = "available";

      return res.status(200).json(
        buildResponse({
          statusCode,
          hasActivePatients,
          state: buildDisplayPayload({
            roomId: room_id,
            stationId,
            statusCode,
            statusLabel: "DISPONIBLE",
          }),
        }),
      );
    } catch (err) {
      console.error("syncStationDisplayState error", err);

      return res.status(500).json({
        ok: false,
        error: "Internal error",
      });
    }
  },
);
