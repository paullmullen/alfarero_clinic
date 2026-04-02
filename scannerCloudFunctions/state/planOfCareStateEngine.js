const STATUS = {
  PENDING: "pending",
  PLANNED: "planned",
  WAITING: "waiting",
  IN_PROCESS: "in_process",
  OBS: "obs",
  COMPLETE: "complete",
};

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

const sortByRouteOrder = (a, b) =>
  (a.route_order ?? 999) - (b.route_order ?? 999);

const getNextRouteOrder = (plan) => {
  const maxRouteOrder = plan.reduce((max, step) => {
    const value = typeof step.route_order === "number" ? step.route_order : 0;
    return Math.max(max, value);
  }, 0);

  return maxRouteOrder + 1;
};

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

export const promoteNextPlannedStationIfNeeded = (plan, now) => {
  if (hasActiveStation(plan)) return plan;

  const planned = plan
    .filter((p) => p.status === STATUS.PLANNED)
    .sort(sortByRouteOrder);

  if (!planned.length) return plan;

  const plannedStationCodes = new Set(
    planned.map((p) => String(p.station || "").toLowerCase()),
  );

  const bothLabAndPhaPlanned =
    plannedStationCodes.has("lab") && plannedStationCodes.has("pha");

  // Manual/scanner pause only when BOTH lab and pha remain planned
  if (bothLabAndPhaPlanned) return plan;

  const next = planned[0];

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

export const applyManualStatusChange = (plan, stationCode, newStatus, now) => {
  let becameComplete = false;

  const ACTIVE_TARGET_STATUSES = new Set([STATUS.WAITING, STATUS.IN_PROCESS]);

  let updated = plan.map((p) => ({ ...p }));

  const current = getScannerCurrentStation(updated);
  const targetIsDifferentStation = current && current.station !== stationCode;
  const activatingDifferentStation = ACTIVE_TARGET_STATUSES.has(newStatus);

  if (targetIsDifferentStation && activatingDifferentStation) {
    updated = updated.map((p) => {
      if (p.station !== current.station) return p;

      if (current.status === STATUS.WAITING) {
        return {
          ...p,
          status: STATUS.PLANNED,
          lastUpdate: now,
        };
      }

      if (
        current.status === STATUS.IN_PROCESS ||
        current.status === STATUS.OBS
      ) {
        becameComplete = true;

        const completedEntry = {
          ...p,
          status: STATUS.COMPLETE,
          lastUpdate: now,
        };

        if (
          current.status === STATUS.IN_PROCESS &&
          p.in_process_start &&
          !p.in_process_end
        ) {
          completedEntry.in_process_end = now;
        }

        return completedEntry;
      }

      return p;
    });
  }

  updated = updated.map((p) => {
    if (p.station !== stationCode) return p;

    if (p.status !== STATUS.COMPLETE && newStatus === STATUS.COMPLETE) {
      becameComplete = true;
    }

    const next = {
      ...p,
      status: newStatus,
      lastUpdate: now,
    };

    if (
      p.status === STATUS.PENDING &&
      newStatus === STATUS.PLANNED &&
      typeof p.route_order !== "number"
    ) {
      next.route_order = getNextRouteOrder(updated);
    }

    if (newStatus === STATUS.WAITING && p.status !== STATUS.WAITING) {
      next.waiting_start = now;
      next.waiting_end = null;
      next.waiting_time = null;
    } else if (p.status === STATUS.WAITING && newStatus !== STATUS.WAITING) {
      next.waiting_end = now;
    }

    if (newStatus === STATUS.IN_PROCESS && p.status !== STATUS.IN_PROCESS) {
      next.in_process_start = now;
      next.in_process_end = null;
      next.procedure_time = null;
    } else if (
      p.status === STATUS.IN_PROCESS &&
      newStatus !== STATUS.IN_PROCESS
    ) {
      next.in_process_end = now;
    }

    return next;
  });

  return becameComplete
    ? promoteNextPlannedStationIfNeeded(updated, now)
    : updated;
};

export const applyScannerEvent = (plan, scannedStation, now) => {
  const current = getScannerCurrentStation(plan);
  const exists = plan.some((p) => p.station === scannedStation);

  let becameComplete = false;
  let updated = plan.map((p) => ({ ...p }));

  const updateStation = (station, updates) => {
    updated = updated.map((p) =>
      p.station === station ? { ...p, ...updates } : p,
    );
  };

  const addScannedStationInProcess = () => {
    updated = [
      ...updated,
      {
        station: scannedStation,
        status: STATUS.IN_PROCESS,
        route_order: getNextRouteOrder(updated),
        waiting_start: null,
        waiting_end: null,
        waiting_time: null,
        in_process_start: now,
        in_process_end: null,
        procedure_time: null,
        lastUpdate: now,
      },
    ];
  };

  if (!current) {
    if (!exists) {
      addScannedStationInProcess();
      return updated;
    }

    updateStation(scannedStation, {
      status: STATUS.IN_PROCESS,
      in_process_start: now,
      in_process_end: null,
      procedure_time: null,
      lastUpdate: now,
    });

    return updated;
  }

  const isSame = current.station === scannedStation;

  if (isSame) {
    if (current.status === STATUS.IN_PROCESS) {
      updateStation(scannedStation, {
        status: STATUS.COMPLETE,
        in_process_end: now,
        lastUpdate: now,
      });
      becameComplete = true;
    } else {
      updateStation(scannedStation, {
        status: STATUS.IN_PROCESS,
        in_process_start: now,
        in_process_end: null,
        procedure_time: null,
        lastUpdate: now,
      });
    }
  } else {
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

    if (!exists) {
      addScannedStationInProcess();
    } else {
      updateStation(scannedStation, {
        status: STATUS.IN_PROCESS,
        in_process_start: now,
        in_process_end: null,
        procedure_time: null,
        lastUpdate: now,
      });
    }
  }

  return becameComplete
    ? promoteNextPlannedStationIfNeeded(updated, now)
    : updated;
};

export const isReadyForCheckout = (plan) => {
  return plan.every(
    (p) => p.status === STATUS.PENDING || p.status === STATUS.COMPLETE,
  );
};
