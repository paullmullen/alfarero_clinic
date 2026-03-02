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

  // --- Hourly counts ---
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
