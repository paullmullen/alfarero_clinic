"use strict";

const { sendEmail } = require("./mailer");

const { buildDailyEmailHTML } = require("./template");

const {
  detectWaitTimeAnomalies,
  computeHistoricalHourlyAverages,
  detectArrivalSurges,
  detectFlowBottlenecks,
  detectNewPatientTrends,
  renderInsightsHTML,
  persistInsights,
} = require("../insights");

const {
  computePatientInsightsFromSnapshots,
  getVisitTypeMetrics,
  getMilestoneProjection,
  // NEW (you will add this export in dailyEmail/metrics.js)
  computeStationPlanVsComplete,
} = require("./metrics");

const {
  getLocalDayRangeTimestamps,
  getStartOf30DaysAgoTimestamp,
  getClinicYMD,
} = require("./time");

const {
  fetchTodayPatients,
  fetchLast30DaysPatients,
  fetchRecipients,
  fetchStationThresholds,
  fetchVisitTypeLabelMap,
  fetchTotalPatients,
} = require("./queries");

// Charts
const generatePatientSummaryChart = require("../charts/patientSummary");
const generateStationPlanVsCompletedChart = require("../charts/stationPlanVsCompleted");
const generateNewVsRepeatPieChart = require("../charts/newVsRepeatPie");
const generateArrivalChart = require("../charts/arrivalsByHour");
const generateWaitingTimeChart = require("../charts/waitingByStation");
const generateWaitingHeatmapChart = require("../charts/waitingHeatmap");
const generateVisitTypeChart = require("../charts/visitTypeChart");

const TIMEZONE_OFFSET_MINUTES = 6 * 60; // UTC-6

let db = null;
let Timestamp = null;

function initDailyEmailDeps({ db: _db, Timestamp: _Timestamp }) {
  db = _db;
  Timestamp = _Timestamp;
}

function buildDefaultStationLabelMap() {
  // You can replace this later with a DB-backed map if you want.
  return {
    nur: "Enfermería",
    doc: "Doctor",
    ped: "Pediatría",
    og: "Clínica General",
    lab: "Laboratorio",
    den: "Odontología",
    pt: "Fisioterapia",
    nut: "Nutrición",
    pha: "Farmacia",
    psi: "Psicología",
    reg: "Registro",
  };
}

async function sendDailyEmails() {
  if (!db || !Timestamp) {
    throw new Error(
      "dailyEmail deps not initialized. Call initDailyEmailDeps({db, Timestamp}) first.",
    );
  }

  // --- Clinic day window ---
  const { startOfToday, startOfTomorrow } =
    getLocalDayRangeTimestamps(Timestamp);

  // --- Pull snapshots ---
  const todaySnapshot = await fetchTodayPatients({
    db,
    startOfToday,
    startOfTomorrow,
  });

  if (todaySnapshot.empty) {
    return [];
  }

  const startOf30DaysAgoTimestamp = getStartOf30DaysAgoTimestamp(Timestamp);

  const last30DaysSnapshot = await fetchLast30DaysPatients({
    db,
    startOf30DaysAgoTimestamp,
  });

  // --- Recipients ---
  const recipients = await fetchRecipients({ db });

  if (recipients.length === 0) {
    console.log("No users with dailyEmail permission found.");
    return [];
  }

  console.log("Number of email recipients", recipients.length);

  // --- Hourly counts (based on start_time of patients in today's cohort) ---
  const hourlyCounts = {};
  for (let hour = 7; hour <= 17; hour++) hourlyCounts[hour] = 0;

  todaySnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.start_time) {
      const localDate = new Date(
        data.start_time.toDate().getTime() -
          TIMEZONE_OFFSET_MINUTES * 60 * 1000,
      );
      const hour = localDate.getHours();
      if (hour in hourlyCounts) hourlyCounts[hour]++;
    }
  });

  // --- Patient summary ---
  const patientInsights = computePatientInsightsFromSnapshots(
    todaySnapshot,
    last30DaysSnapshot,
    TIMEZONE_OFFSET_MINUTES,
  );

  // --- Visit type metrics ---
  const {
    todayCounts: visitTodayCounts,
    avg30Counts: visitAvgCounts,
    orderedKeys,
  } = getVisitTypeMetrics(
    todaySnapshot,
    last30DaysSnapshot,
    TIMEZONE_OFFSET_MINUTES,
  );

  const visitTypeLabelMap = await fetchVisitTypeLabelMap({ db });
  const thresholds = await fetchStationThresholds({ db });

  const totalPatientsRaw = await fetchTotalPatients({ db });
  const totalPatients = totalPatientsRaw + 4074;

  const { nextMilestone, projectedDateStr } = getMilestoneProjection(
    totalPatients,
    patientInsights.avgCounts.total,
  );

  // --- NEW: station planned vs completed (patients complete only, exclude reg) ---
  // NOTE: this assumes you've updated:
  //  - queries.fetchTodayPatients() to use stop_time window + complete==true
  //  - queries.fetchLast30DaysPatients() to use stop_time >= + complete==true
  //  - metrics to export computeStationPlanVsComplete()
  const stationMetrics = computeStationPlanVsComplete(
    todaySnapshot,
    last30DaysSnapshot,
    TIMEZONE_OFFSET_MINUTES,
  );

  // Order stations (by planned today desc, then code)
  const stationKeys = Array.from(
    new Set([
      ...Object.keys(stationMetrics?.today?.planned ?? {}),
      ...Object.keys(stationMetrics?.today?.completed ?? {}),
    ]),
  );

  stationKeys.sort((a, b) => {
    const ap = stationMetrics.today.planned?.[a] ?? 0;
    const bp = stationMetrics.today.planned?.[b] ?? 0;
    if (bp !== ap) return bp - ap;
    return a.localeCompare(b);
  });

  const stationLabelMap = buildDefaultStationLabelMap();

  // --- Charts ---
  const patientSummaryChart = generatePatientSummaryChart(
    patientInsights.todayCounts,
    patientInsights.avgCounts,
  );

  const newVsRepeatChart = generateNewVsRepeatPieChart(todaySnapshot);

  const visitTypeChart = generateVisitTypeChart(
    visitTodayCounts,
    visitAvgCounts,
    orderedKeys,
    visitTypeLabelMap,
  );

  const arrivalChart = generateArrivalChart(hourlyCounts);
  const waitingChart = generateWaitingTimeChart(todaySnapshot);

  const waitingHeatmap = generateWaitingHeatmapChart(todaySnapshot, {
    thresholds,
    timezoneOffsetMinutes: TIMEZONE_OFFSET_MINUTES,
    startOfToday,
    startOfTomorrow,
  });

  // NEW chart: Planned vs Completed by station (today only)
  // (Template must render charts.stationPlanVsCompletedChart to display it.)
  const stationPlanVsCompletedChart = generateStationPlanVsCompletedChart(
    stationMetrics.today,
    stationKeys,
    stationLabelMap,
  );

  // --- Insights ---
  const historicalHourlyAvg = computeHistoricalHourlyAverages(
    last30DaysSnapshot,
    TIMEZONE_OFFSET_MINUTES,
  );

  const aiInsights = [
    ...detectWaitTimeAnomalies(todaySnapshot, last30DaysSnapshot, thresholds),
    ...detectArrivalSurges(hourlyCounts, historicalHourlyAvg),
    ...detectFlowBottlenecks(todaySnapshot),
    ...detectNewPatientTrends(todaySnapshot, last30DaysSnapshot),
  ];

  const clinicDate = getClinicYMD();
  await persistInsights({ db, Timestamp }, aiInsights, clinicDate);

  const insightsHTML = renderInsightsHTML(aiInsights);

  // --- Build Email HTML ---
  const html = buildDailyEmailHTML({
    patientInsights,
    charts: {
      patientSummaryChart,
      newVsRepeatChart,
      visitTypeChart,
      arrivalChart,
      waitingChart,
      waitingHeatmap,

      // NEW
      stationPlanVsCompletedChart,
    },
    insightsHTML,
    totals: { totalPatients },
    milestone: { nextMilestone, projectedDateStr },
  });

  // --- Send Emails (direct nodemailer) ---
  const results = await Promise.all(
    recipients.map(async ({ email }) => {
      try {
        await sendEmail({
          to: email,
          subject: "Informe Diario de Pacientes",
          html,
          attachments: [],
        });

        console.log(`Email sent to ${email}`);
        return { email, status: "sent" };
      } catch (error) {
        const msg = error?.message ?? String(error);
        console.error(`Failed to send email to ${email}: ${msg}`);
        return { email, status: "failed", error: msg };
      }
    }),
  );

  return results;
}

module.exports = {
  initDailyEmailDeps,
  sendDailyEmails,
  TIMEZONE_OFFSET_MINUTES,
};
