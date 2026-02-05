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
    if (!station || status === "pending" || station === "reg") continue;

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
    if (!data.start_time) return;

    const localDate = new Date(
      data.start_time.toDate().getTime() - timezoneOffsetMinutes * 60 * 1000,
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
};
