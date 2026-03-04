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
  computeStationPlanVsComplete,

  // NEW
  computeDailyVolumeTimeline,
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

  // NEW
  fetchOpsObservations,
  fetchObservationTypes,
} = require("./queries");

// Charts
const generatePatientSummaryChart = require("../charts/patientSummary");
const generateStationPlanVsCompletedChart = require("../charts/stationPlanVsCompleted");
const generateNewVsRepeatPieChart = require("../charts/newVsRepeatPie");
const generateArrivalChart = require("../charts/arrivalsByHour");
const generateWaitingTimeChart = require("../charts/waitingByStation");
const generateWaitingHeatmapChart = require("../charts/waitingHeatmap");
const generateVisitTypeChart = require("../charts/visitTypeChart");

// NEW
const generateDailyVolumeWithObservations = require("../charts/dailyVolumeWithObservations");

const TIMEZONE_OFFSET_MINUTES = 6 * 60; // UTC-6

let db = null;
let Timestamp = null;

function initDailyEmailDeps({ db: _db, Timestamp: _Timestamp }) {
  db = _db;
  Timestamp = _Timestamp;
}

function buildDefaultStationLabelMap() {
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

function buildKeyObservationsHTML(observations, typesById) {
  if (!observations || observations.length === 0) return "";

  const sorted = [...observations]
    .sort((a, b) => {
      const aTime = a?.date?.toMillis ? a.date.toMillis() : 0;
      const bTime = b?.date?.toMillis ? b.date.toMillis() : 0;
      return bTime - aTime;
    })
    .slice(0, 3);

  const rows = sorted
    .map((o) => {
      const type = typesById[o.typeId] || {};
      const impact = type.impact === "positive" ? "🟢" : "🔴";

      const note = o.notes ? ` — ${o.notes}` : "";

      return `<li style="margin-bottom:4px;">${impact} ${o.ymd}${note}</li>`;
    })
    .join("");

  return `
<div style="margin:0 0 30px 0;">
  <div style="font-family: Arial, sans-serif; font-size:16px; font-weight:700; margin-bottom:6px;">
    Observaciones Clave
  </div>
  <ul style="margin:0; padding-left:18px; font-family: Arial, sans-serif; font-size:13px;">
    ${rows}
  </ul>
</div>
`;
}

async function sendDailyEmails() {
  if (!db || !Timestamp) {
    throw new Error(
      "dailyEmail deps not initialized. Call initDailyEmailDeps({db, Timestamp}) first.",
    );
  }

  const { startOfToday, startOfTomorrow } =
    getLocalDayRangeTimestamps(Timestamp);

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

  const recipients = await fetchRecipients({ db });

  if (recipients.length === 0) {
    console.log("No users with dailyEmail permission found.");
    return [];
  }

  console.log("Number of email recipients", recipients.length);

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

  const patientInsights = computePatientInsightsFromSnapshots(
    todaySnapshot,
    last30DaysSnapshot,
    TIMEZONE_OFFSET_MINUTES,
  );

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

  const stationMetrics = computeStationPlanVsComplete(
    todaySnapshot,
    last30DaysSnapshot,
    TIMEZONE_OFFSET_MINUTES,
  );

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

  const stationPlanVsCompletedChart = generateStationPlanVsCompletedChart(
    stationMetrics.today,
    stationKeys,
    stationLabelMap,
  );

  // ---------------- NEW SECTION ----------------

  const DAYS = 14;

  // ✅ Fix: correct argument order (snapshot, offset, days)
  const timeline = computeDailyVolumeTimeline(
    last30DaysSnapshot,
    TIMEZONE_OFFSET_MINUTES,
    DAYS,
  );

  // ✅ Fetch ops data (works with your queries.js)
  const observations = await fetchOpsObservations({ db, days: DAYS });
  const observationTypes = await fetchObservationTypes({ db });

  // ✅ Fix: use timeline.values (not timeline.counts)
  const dailyVolumeChart = generateDailyVolumeWithObservations({
    labels: timeline.labels,
    volumeData: timeline.values,
    observations,
    typesById: observationTypes,
    daysLabel: `(últimos ${DAYS} días)`,
  });

  // ✅ Fix: DEFINE keyObservationsHTML so it exists
  const keyObservationsHTML = buildKeyObservationsHTML(
    observations,
    observationTypes,
  );

  // ---------------- END NEW SECTION ----------------

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

  const html = buildDailyEmailHTML({
    patientInsights,
    charts: {
      patientSummaryChart,
      newVsRepeatChart,
      visitTypeChart,
      arrivalChart,
      waitingChart,
      waitingHeatmap,
      stationPlanVsCompletedChart,

      // NEW
      dailyVolumeChart,
      keyObservationsHTML,
    },
    insightsHTML,
    totals: { totalPatients },
    milestone: { nextMilestone, projectedDateStr },
  });

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
