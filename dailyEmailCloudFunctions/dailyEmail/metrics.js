// dailyEmail/metrics.js
"use strict";

/**
 * Pure compute helpers — no Firestore reads here.
 * TIMEZONE_OFFSET_MINUTES is passed in so this stays pure and testable.
 */

function classifyServices(planOfCare) {
  const services = new Set();
  for (const entry of planOfCare ?? []) {
    const { station, status } = entry;

    // Only EXECUTED services
    if (!station || station === "reg" || status !== "complete") continue;

    switch (station) {
      case "ped":
        services.add("pediatria");
        break;
      case "doc":
      case "og":
        services.add("clinica_general");
        break;
      case "pt":
        services.add("fisioterapia");
        break;
      case "den":
        services.add("odontologia");
        break;
      case "lab":
        services.add("laboratorio");
        break;
      default:
        break;
    }
  }
  return services;
}

function computeStationPlanVsComplete(
  todaySnapshot,
  last30DaysSnapshot,
  timezoneOffsetMinutes,
) {
  const EXCLUDED_STATIONS = new Set(["reg"]);

  const todayPlanned = {};
  const todayCompleted = {};

  const lastPlanned = {};
  const lastCompleted = {};
  const uniqueDateSet = new Set();

  // ---- TODAY ----
  todaySnapshot.forEach((doc) => {
    const data = doc.data();
    const poc = Array.isArray(data.plan_of_care) ? data.plan_of_care : [];

    for (const step of poc) {
      const { station, status } = step;
      if (!station || EXCLUDED_STATIONS.has(station)) continue;

      if (status && status !== "pending") {
        todayPlanned[station] = (todayPlanned[station] ?? 0) + 1;
      }

      if (status === "complete") {
        todayCompleted[station] = (todayCompleted[station] ?? 0) + 1;
      }
    }
  });

  // ---- LAST 30 DAYS ----
  last30DaysSnapshot.forEach((doc) => {
    const data = doc.data();
    if (!data.stop_time) return;

    const localDate = new Date(
      data.stop_time.toDate().getTime() - timezoneOffsetMinutes * 60 * 1000,
    );
    const dateKey = localDate.toISOString().split("T")[0];
    uniqueDateSet.add(dateKey);

    const poc = Array.isArray(data.plan_of_care) ? data.plan_of_care : [];

    for (const step of poc) {
      const { station, status } = step;
      if (!station || EXCLUDED_STATIONS.has(station)) continue;

      if (status && status !== "pending") {
        lastPlanned[station] = (lastPlanned[station] ?? 0) + 1;
      }

      if (status === "complete") {
        lastCompleted[station] = (lastCompleted[station] ?? 0) + 1;
      }
    }
  });

  const daysWithPatients = uniqueDateSet.size || 1;

  const avgPlanned = {};
  const avgCompleted = {};
  const avgNotCompleted = {};

  const stations = new Set([
    ...Object.keys(lastPlanned),
    ...Object.keys(lastCompleted),
  ]);

  for (const s of stations) {
    const pl = lastPlanned[s] ?? 0;
    const co = lastCompleted[s] ?? 0;

    avgPlanned[s] = pl / daysWithPatients;
    avgCompleted[s] = co / daysWithPatients;
    avgNotCompleted[s] = (pl - co) / daysWithPatients;
  }

  const todayNotCompleted = {};
  const todayStations = new Set([
    ...Object.keys(todayPlanned),
    ...Object.keys(todayCompleted),
  ]);

  for (const s of todayStations) {
    const pl = todayPlanned[s] ?? 0;
    const co = todayCompleted[s] ?? 0;
    todayNotCompleted[s] = Math.max(0, pl - co);
  }

  return {
    today: {
      planned: todayPlanned,
      completed: todayCompleted,
      notCompleted: todayNotCompleted,
    },
    avg30: {
      planned: avgPlanned,
      completed: avgCompleted,
      notCompleted: avgNotCompleted,
    },
  };
}

/**
 * Daily patient volume timeline for the last N days (default 14).
 * Uses start_time and timezoneOffsetMinutes to bucket patients into local YYYY-MM-DD.
 */
function computeDailyVolumeTimeline(
  last30DaysSnapshot,
  timezoneOffsetMinutes,
  days = 14,
) {
  // Build last N local days (including today) as YYYY-MM-DD labels
  const todayLocal = new Date(Date.now() - timezoneOffsetMinutes * 60 * 1000);
  todayLocal.setHours(0, 0, 0, 0);

  const labels = [];
  const counts = {};

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(todayLocal);
    d.setDate(d.getDate() - i);
    const ymd = d.toISOString().split("T")[0];
    labels.push(ymd);
    counts[ymd] = 0;
  }

  // Count patients per local day using start_time
  last30DaysSnapshot.forEach((doc) => {
    const data = doc.data();
    if (!data.start_time) return;

    const localDate = new Date(
      data.start_time.toDate().getTime() - timezoneOffsetMinutes * 60 * 1000,
    );
    const ymd = localDate.toISOString().split("T")[0];

    if (counts[ymd] !== undefined) counts[ymd] += 1;
  });

  const values = labels.map((ymd) => counts[ymd] ?? 0);
  return { labels, values };
}

function computePatientInsightsFromSnapshots(
  todaySnapshot,
  last30DaysSnapshot,
  timezoneOffsetMinutes,
) {
  const todayCounts = {
    total: 0,
    pediatria: 0,
    clinica_general: 0,
    fisioterapia: 0,
    odontologia: 0,
    laboratorio: 0,
  };

  const last30DaysCounts = {
    total: 0,
    pediatria: 0,
    clinica_general: 0,
    fisioterapia: 0,
    odontologia: 0,
    laboratorio: 0,
  };

  const uniqueDateSet = new Set();

  todaySnapshot.forEach((doc) => {
    const data = doc.data();
    todayCounts.total += 1;

    const services = classifyServices(data.plan_of_care);
    for (const service of services) {
      todayCounts[service]++;
    }
  });

  last30DaysSnapshot.forEach((doc) => {
    const data = doc.data();
    if (!data.stop_time) return;

    const localDate = new Date(
      data.stop_time.toDate().getTime() - timezoneOffsetMinutes * 60 * 1000,
    );
    const dateKey = localDate.toISOString().split("T")[0];
    uniqueDateSet.add(dateKey);

    last30DaysCounts.total += 1;

    const services = classifyServices(data.plan_of_care);
    for (const service of services) {
      last30DaysCounts[service]++;
    }
  });

  const daysWithPatients = uniqueDateSet.size || 1;
  const avgCounts = {};
  for (const key in last30DaysCounts) {
    avgCounts[key] = last30DaysCounts[key] / daysWithPatients;
  }

  return { todayCounts, avgCounts };
}

function getVisitTypeMetrics(
  todaySnapshot,
  last30DaysSnapshot,
  timezoneOffsetMinutes,
) {
  const todayCounts = {};
  todaySnapshot.forEach((doc) => {
    const data = doc.data();
    const vtype = (data.type_of_visit ?? "desconocido").toString();
    todayCounts[vtype] = (todayCounts[vtype] ?? 0) + 1;
  });

  const lastCounts = {};
  const uniqueDateSet = new Set();

  last30DaysSnapshot.forEach((doc) => {
    const data = doc.data();
    if (!data.start_time) return;

    const localDate = new Date(
      data.start_time.toDate().getTime() - timezoneOffsetMinutes * 60 * 1000,
    );
    const dateKey = localDate.toISOString().split("T")[0];
    uniqueDateSet.add(dateKey);

    const vtype = (data.type_of_visit ?? "desconocido").toString();
    lastCounts[vtype] = (lastCounts[vtype] ?? 0) + 1;
  });

  const daysWithPatients = uniqueDateSet.size || 1;
  const avg30Counts = {};
  for (const key of Object.keys(lastCounts)) {
    avg30Counts[key] = lastCounts[key] / daysWithPatients;
  }

  const allKeys = Array.from(
    new Set([...Object.keys(todayCounts), ...Object.keys(avg30Counts)]),
  );
  allKeys.sort((a, b) => {
    const av = todayCounts[a] ?? avg30Counts[a] ?? 0;
    const bv = todayCounts[b] ?? avg30Counts[b] ?? 0;
    return bv - av;
  });

  return { todayCounts, avg30Counts, orderedKeys: allKeys };
}

function getMilestoneProjection(totalPatients, avgDailyPatients) {
  const milestoneStep = 5000;
  const nextMilestone =
    Math.ceil(totalPatients / milestoneStep) * milestoneStep;

  const patientsRemaining = nextMilestone - totalPatients;

  const avgPerWorkingDay = avgDailyPatients * (7 / 5);
  const workingDaysNeeded = patientsRemaining / avgPerWorkingDay;
  const calendarDaysNeeded = workingDaysNeeded * (7 / 5);

  const projectedDate = new Date();
  projectedDate.setDate(
    projectedDate.getDate() + Math.round(calendarDaysNeeded),
  );

  const projectedDateStr = projectedDate.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return { nextMilestone, projectedDateStr, patientsRemaining };
}

module.exports = {
  classifyServices,
  computePatientInsightsFromSnapshots,
  getVisitTypeMetrics,
  getMilestoneProjection,
  computeStationPlanVsComplete, // <-- ADD THIS
  computeDailyVolumeTimeline, // <-- NEW
};
