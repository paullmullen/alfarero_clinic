const STATUS = {
  PENDING: "pending",
  PLANNED: "planned",
  WAITING: "waiting",
  IN_PROCESS: "in_process",
  OBS: "obs",
  COMPLETE: "complete",
};

const AUTO_PROMOTION_EXCLUDED = new Set(["lab", "pha"]);

const SCANNER_CURRENT_PRIORITY = {
  in_process: 1,
  waiting: 2,
  obs: 3,
};

const SCANNER_CURRENT_CANDIDATES = new Set([
  STATUS.IN_PROCESS,
  STATUS.WAITING,
  STATUS.OBS,
]);

// -------------------------
// Helpers
// -------------------------

const sortByRouteOrder = (a, b) =>
  (a.route_order ?? 999) - (b.route_order ?? 999);

export const getScannerCurrentStation = (plan) => {
  const candidates = plan
    .filter((p) => SCANNER_CURRENT_CANDIDATES.has(p.status))
    .sort((a, b) => {
      const pa = SCANNER_CURRENT_PRIORITY[a.status] ?? 99;
      const pb = SCANNER_CURRENT_PRIORITY[b.status] ?? 99;
      if (pa !== pb) return pa - pb;
      return sortByRouteOrder(a, b);
    });

  return candidates[0] || null;
};

const hasActiveStation = (plan) =>
  plan.some((p) => [STATUS.WAITING, STATUS.IN_PROCESS].includes(p.status));

// -------------------------
// Promotion logic (shared)
// -------------------------

export const promoteNextPlannedStationIfNeeded = (plan, now) => {
  if (hasActiveStation(plan)) return plan;

  const planned = plan
    .filter((p) => p.status === STATUS.PLANNED)
    .sort(sortByRouteOrder);

  if (!planned.length) return plan;

  const nonExcluded = planned.filter(
    (p) => !AUTO_PROMOTION_EXCLUDED.has(p.station),
  );

  // If only lab/pha remain → do nothing
  if (nonExcluded.length === 0) return plan;

  const next = nonExcluded[0];

  return plan.map((p) =>
    p.station === next.station
      ? {
          ...p,
          status: STATUS.WAITING,
          waiting_start: now,
          lastUpdate: now,
        }
      : p,
  );
};

// -------------------------
// Manual change
// -------------------------

export const applyManualStatusChange = (plan, stationCode, newStatus, now) => {
  let becameComplete = false;

  const updated = plan.map((p) => {
    if (p.station !== stationCode) return p;

    if (p.status !== STATUS.COMPLETE && newStatus === STATUS.COMPLETE) {
      becameComplete = true;
    }

    const next = {
      ...p,
      status: newStatus,
      lastUpdate: now,
    };

    if (newStatus === STATUS.WAITING && p.status !== STATUS.WAITING) {
      next.waiting_start = now;
      next.waiting_end = null;
    }

    if (newStatus === STATUS.IN_PROCESS && p.status !== STATUS.IN_PROCESS) {
      next.in_process_start = now;
      next.in_process_end = null;
    }

    if (p.status === STATUS.IN_PROCESS && newStatus !== STATUS.IN_PROCESS) {
      next.in_process_end = now;
    }

    return next;
  });

  return becameComplete
    ? promoteNextPlannedStationIfNeeded(updated, now)
    : updated;
};

// -------------------------
// Scanner event
// -------------------------

export const applyScannerEvent = (plan, scannedStation, now) => {
  const current = getScannerCurrentStation(plan);

  let becameComplete = false;

  let updated = plan.map((p) => ({ ...p }));

  const updateStation = (station, updates) => {
    updated = updated.map((p) =>
      p.station === station ? { ...p, ...updates } : p,
    );
  };

  if (!current) {
    // no active station → start scanned
    updateStation(scannedStation, {
      status: STATUS.IN_PROCESS,
      in_process_start: now,
      lastUpdate: now,
    });
    return updated;
  }

  const isSame = current.station === scannedStation;

  if (isSame) {
    if (current.status === STATUS.WAITING) {
      updateStation(scannedStation, {
        status: STATUS.IN_PROCESS,
        in_process_start: now,
        lastUpdate: now,
      });
    } else if (current.status === STATUS.IN_PROCESS) {
      updateStation(scannedStation, {
        status: STATUS.COMPLETE,
        in_process_end: now,
        lastUpdate: now,
      });
      becameComplete = true;
    } else if (current.status === STATUS.OBS) {
      updateStation(scannedStation, {
        status: STATUS.IN_PROCESS,
        in_process_start: now,
        lastUpdate: now,
      });
    }
  } else {
    // different station scanned

    if (current.status === STATUS.WAITING) {
      updateStation(current.station, {
        status: STATUS.PLANNED,
        lastUpdate: now,
      });
    }

    if (current.status === STATUS.IN_PROCESS) {
      updateStation(current.station, {
        status: STATUS.COMPLETE,
        in_process_end: now,
        lastUpdate: now,
      });
      becameComplete = true;
    }

    if (current.status === STATUS.OBS) {
      updateStation(current.station, {
        status: STATUS.COMPLETE,
        lastUpdate: now,
      });
      becameComplete = true;
    }

    // scanned station always becomes in_process
    updateStation(scannedStation, {
      status: STATUS.IN_PROCESS,
      in_process_start: now,
      lastUpdate: now,
    });
  }

  return becameComplete
    ? promoteNextPlannedStationIfNeeded(updated, now)
    : updated;
};

// -------------------------
// Checkout
// -------------------------

export const isReadyForCheckout = (plan) => {
  return plan.every(
    (p) => p.status === STATUS.PENDING || p.status === STATUS.COMPLETE,
  );
};
