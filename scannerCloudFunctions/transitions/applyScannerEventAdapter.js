import admin from "firebase-admin";
import { applyScannerEvent } from "../state/planOfCareStateEngine.js";

function toMillis(value) {
  if (!value) return null;
  if (typeof value === "number") return value;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value?._seconds != null) {
    return value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1e6);
  }
  if (value instanceof Date) return value.getTime();
  return null;
}

function diffSeconds(start, end) {
  const startMs = toMillis(start);
  const endMs = toMillis(end);
  if (startMs == null || endMs == null) return null;
  return Math.max(0, Math.round((endMs - startMs) / 1000));
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureEncountersArray(stationEntry) {
  if (!Array.isArray(stationEntry.encounters)) {
    stationEntry.encounters = [];
  }
}

function getNextEncounterId(stationEntry) {
  ensureEncountersArray(stationEntry);

  let maxN = 0;
  for (const encounter of stationEntry.encounters) {
    const id = encounter?.encounter_id || "";
    const match = id.match(/_(\d+)$/);
    if (match) {
      maxN = Math.max(maxN, Number(match[1]));
    }
  }

  return `${stationEntry.station}_${maxN + 1}`;
}

function getOpenEncounter(stationEntry) {
  ensureEncountersArray(stationEntry);
  return (
    stationEntry.encounters.find((enc) => enc && enc.closed !== true) || null
  );
}

function createEncounter({ station, timestamp, source }) {
  return {
    encounter_id: `${station}_1`,
    status: "waiting",
    closed: false,

    waiting_start: timestamp || null,
    waiting_end: null,
    waiting_time: null,

    in_process_start: null,
    in_process_end: null,
    procedure_time: null,

    stats_recorded: false,

    source: source || "scanner",
    createdAt: timestamp || admin.firestore.Timestamp.now(),
  };
}

function recomputeStationTotals(stationEntry) {
  ensureEncountersArray(stationEntry);

  stationEntry.waiting_time = stationEntry.encounters.reduce(
    (sum, encounter) => {
      return sum + (Number(encounter?.waiting_time) || 0);
    },
    0,
  );

  stationEntry.procedure_time = stationEntry.encounters.reduce(
    (sum, encounter) => {
      return sum + (Number(encounter?.procedure_time) || 0);
    },
    0,
  );
}

function reconcileEncounterForInProcess({
  stationEntry,
  previousStatus,
  timestamp,
  source,
}) {
  ensureEncountersArray(stationEntry);

  let encounter = getOpenEncounter(stationEntry);

  if (!encounter) {
    encounter = createEncounter({
      station: stationEntry.station,
      timestamp,
      source,
    });
    encounter.encounter_id = getNextEncounterId(stationEntry);
    stationEntry.encounters.push(encounter);
  }

  // If we came from waiting, preserve/calculate waiting time.
  if (previousStatus === "waiting") {
    encounter.waiting_start =
      encounter.waiting_start || stationEntry.waiting_start || timestamp;
    encounter.waiting_end = stationEntry.waiting_end || timestamp;
    encounter.waiting_time = diffSeconds(
      encounter.waiting_start,
      encounter.waiting_end,
    );
  } else {
    // Direct scan into in_process from planned / pending / complete / obs:
    // treat waiting as zero-length for encounter bookkeeping.
    encounter.waiting_start = encounter.waiting_start || timestamp || null;
    encounter.waiting_end = encounter.waiting_end || timestamp || null;
    encounter.waiting_time =
      encounter.waiting_time != null
        ? encounter.waiting_time
        : diffSeconds(encounter.waiting_start, encounter.waiting_end);
  }

  encounter.in_process_start =
    encounter.in_process_start || stationEntry.in_process_start || timestamp;
  encounter.in_process_end = null;
  encounter.procedure_time = null;
  encounter.status = "in_process";
  encounter.closed = false;
  encounter.source = source;

  recomputeStationTotals(stationEntry);

  return encounter;
}

function reconcileEncounterForComplete({ stationEntry, timestamp, source }) {
  ensureEncountersArray(stationEntry);

  let encounter = getOpenEncounter(stationEntry);

  if (!encounter) {
    encounter = createEncounter({
      station: stationEntry.station,
      timestamp,
      source,
    });
    encounter.encounter_id = getNextEncounterId(stationEntry);
    stationEntry.encounters.push(encounter);
  }

  encounter.in_process_start =
    encounter.in_process_start || stationEntry.in_process_start || timestamp;
  encounter.in_process_end = stationEntry.in_process_end || timestamp || null;
  encounter.procedure_time = diffSeconds(
    encounter.in_process_start,
    encounter.in_process_end,
  );
  encounter.status = "complete";
  encounter.closed = true;
  encounter.stats_recorded = false;
  encounter.source = source;

  recomputeStationTotals(stationEntry);

  return encounter;
}

export function applyScannerEventAdapter({
  visitData,
  station,
  timestamp,
  source = "scanner",
}) {
  const originalPlan = Array.isArray(visitData?.plan_of_care)
    ? deepClone(visitData.plan_of_care)
    : [];

  // Validate station BEFORE doing anything
  const stationExists = originalPlan.some((p) => p.station === station);

  if (!stationExists) {
    return {
      changed: false,
      reason: `invalid_station:${station}`,
      updatedPlanOfCare: originalPlan,
      stationIndex: -1,
      stationEntry: null,
      encounter: null,
      encounterClosed: false,
      targetStatus: null,
      promoted: false,
      promotedIndex: -1,
      promotedStation: null,
      statsStation: null,
      source,
    };
  }

  const enginePlan = applyScannerEvent(originalPlan, station, timestamp);
  const updatedPlan = deepClone(enginePlan);

  const originalByStation = new Map(
    originalPlan.map((step) => [step.station, step]),
  );

  let changed = JSON.stringify(originalPlan) !== JSON.stringify(updatedPlan);

  let encounterClosed = false;
  let closedEncounter = null;
  let statsStation = null;

  for (const updatedStep of updatedPlan) {
    ensureEncountersArray(updatedStep);

    const originalStep = originalByStation.get(updatedStep.station) || null;
    const previousStatus = originalStep?.status || null;
    const nextStatus = updatedStep.status || null;

    // Station newly entered / re-entered in_process
    if (nextStatus === "in_process" && previousStatus !== "in_process") {
      reconcileEncounterForInProcess({
        stationEntry: updatedStep,
        previousStatus,
        timestamp,
        source,
      });
      changed = true;
    }

    // Station completed from in_process
    if (previousStatus === "in_process" && nextStatus === "complete") {
      const encounter = reconcileEncounterForComplete({
        stationEntry: updatedStep,
        timestamp,
        source,
      });

      encounterClosed = true;
      closedEncounter = encounter;
      statsStation = updatedStep.station;
      changed = true;
    }

    // Station completed from obs: close any open encounter if one exists
    if (previousStatus === "obs" && nextStatus === "complete") {
      const open = getOpenEncounter(updatedStep);
      if (open) {
        const encounter = reconcileEncounterForComplete({
          stationEntry: updatedStep,
          timestamp,
          source,
        });

        encounterClosed = true;
        closedEncounter = encounter;
        statsStation = updatedStep.station;
        changed = true;
      }
    }
  }

  if (!changed) {
    return {
      changed: false,
      reason: "noop",
      updatedPlanOfCare: originalPlan,
      stationIndex: -1,
      stationEntry: null,
      encounter: null,
      encounterClosed: false,
      targetStatus: null,
      promoted: false,
      promotedIndex: -1,
      promotedStation: null,
      statsStation: null,
      source,
    };
  }

  const stationIndex = updatedPlan.findIndex((p) => p.station === station);
  const stationEntry = stationIndex >= 0 ? updatedPlan[stationIndex] : null;
  const targetStatus = stationEntry?.status || null;

  const promotedStation =
    updatedPlan.find((step) => {
      const originalStep = originalByStation.get(step.station);
      return step.status === "waiting" && originalStep?.status === "planned";
    })?.station || null;

  const promotedIndex =
    promotedStation != null
      ? updatedPlan.findIndex((p) => p.station === promotedStation)
      : -1;

  return {
    changed: true,
    reason: "ok",
    updatedPlanOfCare: updatedPlan,
    stationIndex,
    stationEntry,
    encounter: closedEncounter,
    encounterClosed,
    targetStatus,
    promoted: promotedStation != null,
    promotedIndex,
    promotedStation,
    statsStation,
    source,
  };
}
