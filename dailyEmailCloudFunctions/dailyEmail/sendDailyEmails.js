// dailyEmail/sendDailyEmails.js
"use strict";

const axios = require("axios");

const { buildDailyEmailHTML } = require("./template");

const {
  detectWaitTimeAnomalies,
  computeHistoricalHourlyAverages,
  detectArrivalSurges,
  detectFlowBottlenecks,
  renderInsightsHTML,
  persistInsights,
} = require("../insights");

const {
  computePatientInsightsFromSnapshots,
  getVisitTypeMetrics,
  getMilestoneProjection,
} = require("./metrics");

// Time + Queries (new extractions)
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

// Charts (already extracted)
const generatePatientSummaryChart = require("../charts/patientSummary");
const generateNewVsRepeatPieChart = require("../charts/newVsRepeatPie");
const generateArrivalChart = require("../charts/arrivalsByHour");
const generateWaitingTimeChart = require("../charts/waitingByStation");
const generateWaitingHeatmapChart = require("../charts/waitingHeatmap");
const generateVisitTypeChart = require("../charts/visitTypeChart");

// Constants (kept identical)
const SEND_EMAIL_URL = "https://sendemail-479287307088.us-central1.run.app";
const TIMEZONE_OFFSET_MINUTES = 6 * 60; // UTC-6

// Injected deps (from index.js)
let db = null;
let Timestamp = null;

function initDailyEmailDeps({ db: _db, Timestamp: _Timestamp }) {
  db = _db;
  Timestamp = _Timestamp;
}

/* ============================================================
   MAIN
   ============================================================ */

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

  // --- Hourly counts (hoy) ---
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

  // --- Patient summary metrics (no extra reads; uses snapshots) ---
  const patientInsights = computePatientInsightsFromSnapshots(
    todaySnapshot,
    last30DaysSnapshot,
    TIMEZONE_OFFSET_MINUTES,
  );

  // --- Visit type metrics + labels ---
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

  // --- Thresholds for wait-time coloring/alerts ---
  const thresholds = await fetchStationThresholds({ db });

  // --- Total patients for milestones ---
  const totalPatientsRaw = await fetchTotalPatients({ db });
  const totalPatients = totalPatientsRaw + 4074; // pacientes pre-sistema

  const { nextMilestone, projectedDateStr } = getMilestoneProjection(
    totalPatients,
    patientInsights.avgCounts.total,
  );

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
    // Optional tighter step filtering:
    startOfToday,
    startOfTomorrow,
  });

  // --- Operational insights (Option A) ---
  const historicalHourlyAvg = computeHistoricalHourlyAverages(
    last30DaysSnapshot,
    TIMEZONE_OFFSET_MINUTES,
  );

  const aiInsights = [
    ...detectWaitTimeAnomalies(todaySnapshot, last30DaysSnapshot, thresholds),
    ...detectArrivalSurges(hourlyCounts, historicalHourlyAvg),
    ...detectFlowBottlenecks(todaySnapshot),
  ];

  const clinicDate = getClinicYMD();
  await persistInsights({ db, Timestamp }, aiInsights, clinicDate);

  const insightsHTML = renderInsightsHTML(aiInsights);

  // --- Email HTML (kept identical content/order) ---
  const html = buildDailyEmailHTML({
    patientInsights,
    charts: {
      patientSummaryChart,
      newVsRepeatChart,
      visitTypeChart,
      arrivalChart,
      waitingChart,
      waitingHeatmap,
    },
    insightsHTML,
    totals: { totalPatients },
    milestone: { nextMilestone, projectedDateStr },
  });

  // --- Send emails (same behavior) ---
  const results = [];
  for (const { name, email } of recipients) {
    try {
      await axios.post(SEND_EMAIL_URL, {
        to: email,
        subject: "Informe Diario de Pacientes",
        html,
      });
      console.log(`Email sent to ${email}`);
      results.push({ email, status: "sent" });
    } catch (error) {
      const status = error.response?.status ?? "unknown";
      const msg = error.response?.statusText ?? error.message;
      console.error(`Failed to send email to ${email}: [${status}] ${msg}`);
      results.push({ email, status: "failed", error: msg });
    }
  }

  return results;
}

module.exports = {
  initDailyEmailDeps,
  sendDailyEmails,
  TIMEZONE_OFFSET_MINUTES,
};
