import admin from "firebase-admin";

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

function getLowestNumericStepIndex(planOfCare) {
  let bestIndex = -1;
  let bestValue = Number.POSITIVE_INFINITY;

  planOfCare.forEach((step, index) => {
    const n = Number(step?.status);
    if (Number.isFinite(n) && n < bestValue) {
      bestValue = n;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function maybePromoteNextStation({ planOfCare, timestamp }) {
  const nextIndex = getLowestNumericStepIndex(planOfCare);
  if (nextIndex === -1) {
    return { promoted: false, promotedIndex: -1 };
  }

  const nextStep = { ...planOfCare[nextIndex] };

  // Leave routing for lab / pha to Anfitrion
  if (nextStep.station === "lab" || nextStep.station === "pha") {
    return {
      promoted: false,
      promotedIndex: nextIndex,
      reason: `manual_promotion_required:${nextStep.station}`,
    };
  }

  nextStep.status = "waiting";
  nextStep.waiting_start = timestamp || null;
  nextStep.waiting_end = null;
  nextStep.waiting_time = null;
  nextStep.in_process_start = null;
  nextStep.in_process_end = null;
  nextStep.procedure_time = null;
  nextStep.lastUpdate = timestamp || null;

  planOfCare[nextIndex] = nextStep;

  return {
    promoted: true,
    promotedIndex: nextIndex,
    promotedStation: nextStep.station,
  };
}

export function applyScannerAdvance({
  visitData,
  station,
  timestamp,
  source = "scanner",
}) {
  console.log(
    "[DEBUG]" + JSON.stringify({ visitData, station, timestamp, source }),
  );
  const updatedPlanOfCare = deepClone(visitData?.plan_of_care || []);
  const stationIndex = updatedPlanOfCare.findIndex(
    (step) => step.station === station,
  );

  if (stationIndex === -1) {
    return {
      changed: false,
      reason: `station_not_found:${station}`,
      updatedPlanOfCare,
      encounterClosed: false,
    };
  }

  const stationEntry = {
    ...updatedPlanOfCare[stationIndex],
    encounters: Array.isArray(updatedPlanOfCare[stationIndex].encounters)
      ? [...updatedPlanOfCare[stationIndex].encounters]
      : [],
  };

  ensureEncountersArray(stationEntry);

  const currentStatus = stationEntry.status || "waiting";
  let encounter = getOpenEncounter(stationEntry);
  let encounterClosed = false;
  let changed = false;
  let targetStatus = null;
  let promoted = false;
  let promotedIndex = -1;
  let promotedStation = null;

  if (!encounter && currentStatus !== "complete") {
    encounter = createEncounter({ station, timestamp, source });
    encounter.encounter_id = getNextEncounterId(stationEntry);
    stationEntry.encounters.push(encounter);
    changed = true;
  }

  if (currentStatus === "waiting") {
    targetStatus = "in_process";

    if (!encounter) {
      encounter = createEncounter({ station, timestamp, source });
      encounter.encounter_id = getNextEncounterId(stationEntry);
      stationEntry.encounters.push(encounter);
    }

    encounter.waiting_start =
      encounter.waiting_start || stationEntry.waiting_start || timestamp;
    encounter.waiting_end = timestamp || null;
    encounter.waiting_time = diffSeconds(
      encounter.waiting_start,
      encounter.waiting_end,
    );
    encounter.in_process_start = timestamp || null;
    encounter.in_process_end = null;
    encounter.procedure_time = null;
    encounter.status = "in_process";
    encounter.closed = false;
    encounter.source = source;

    stationEntry.status = "in_process";
    stationEntry.waiting_start = encounter.waiting_start;
    stationEntry.waiting_end = encounter.waiting_end;
    stationEntry.waiting_time = encounter.waiting_time;
    stationEntry.in_process_start = encounter.in_process_start;
    stationEntry.in_process_end = null;
    stationEntry.procedure_time = null;
    stationEntry.lastUpdate = timestamp || null;

    changed = true;
  } else if (currentStatus === "in_process") {
    targetStatus = "complete";

    if (!encounter) {
      return {
        changed: false,
        reason: "missing_open_encounter_for_in_process",
        updatedPlanOfCare,
        encounterClosed: false,
      };
    }

    encounter.in_process_start =
      encounter.in_process_start || stationEntry.in_process_start || timestamp;

    encounter.in_process_end = timestamp || null;
    encounter.procedure_time = diffSeconds(
      encounter.in_process_start,
      encounter.in_process_end,
    );
    encounter.status = "complete";
    encounter.closed = true;
    encounter.stats_recorded = false;
    encounter.source = source;

    stationEntry.status = "complete";
    stationEntry.in_process_start = encounter.in_process_start;
    stationEntry.in_process_end = encounter.in_process_end;
    stationEntry.procedure_time = encounter.procedure_time;
    stationEntry.lastUpdate = timestamp || null;

    encounterClosed = true;
    changed = true;
  } else if (currentStatus === "complete") {
    targetStatus = "in_process";

    const newEncounter = createEncounter({ station, timestamp, source });
    newEncounter.encounter_id = getNextEncounterId(stationEntry);

    newEncounter.waiting_start = timestamp || null;
    newEncounter.waiting_end = timestamp || null;
    newEncounter.waiting_time = 0;
    newEncounter.in_process_start = timestamp || null;
    newEncounter.status = "in_process";

    stationEntry.encounters.push(newEncounter);
    encounter = newEncounter;

    stationEntry.status = "in_process";
    stationEntry.waiting_start = newEncounter.waiting_start;
    stationEntry.waiting_end = newEncounter.waiting_end;
    stationEntry.waiting_time = newEncounter.waiting_time;
    stationEntry.in_process_start = newEncounter.in_process_start;
    stationEntry.in_process_end = null;
    stationEntry.procedure_time = null;
    stationEntry.lastUpdate = timestamp || null;

    changed = true;
  } else {
    return {
      changed: false,
      reason: `unsupported_status_for_scanner:${currentStatus}`,
      updatedPlanOfCare,
      encounterClosed: false,
    };
  }

  updatedPlanOfCare[stationIndex] = stationEntry;

  if (encounterClosed) {
    const promotion = maybePromoteNextStation({
      planOfCare: updatedPlanOfCare,
      timestamp,
    });

    promoted = promotion.promoted === true;
    promotedIndex = promotion.promotedIndex ?? -1;
    promotedStation = promotion.promotedStation ?? null;

    if (promoted) {
      changed = true;
    }
  }

  return {
    changed,
    reason: changed ? "ok" : "noop",
    updatedPlanOfCare,
    stationIndex,
    stationEntry,
    encounter,
    encounterClosed,
    targetStatus,
    promoted,
    promotedIndex,
    promotedStation,
  };
}
