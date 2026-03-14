import { sendEmail } from "./mailer.js";
import { buildDailyEmailHTML } from "./template.js";
import { renderKeyObservationsHTML } from "./renderKeyObservationsHTML.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const es = require("../i18n/es.json");

import {
  detectWaitTimeAnomalies,
  computeHistoricalHourlyAverages,
  detectArrivalSurges,
  detectFlowBottlenecks,
  detectNewPatientTrends,
  detectServiceSuppression,
  attachObservationsToInsights,
  buildObservationInsights,
  renderInsightsHTML,
  persistInsights,
} from "../insights.js";

import {
  computePatientInsightsFromSnapshots,
  getVisitTypeMetrics,
  getMilestoneProjection,
  computeStationPlanVsComplete,
  computeDailyVolumeTimeline,
} from "./metrics.js";

import {
  getLocalDayRangeTimestamps,
  getStartOf30DaysAgoTimestamp,
  getClinicYMD,
} from "./time.js";

import {
  fetchTodayPatients,
  fetchLast30DaysPatients,
  fetchRecipients,
  fetchStationThresholds,
  fetchVisitTypeLabelMap,
  fetchTotalPatients,
  fetchOpsObservations,
  fetchObservationTypes,
} from "./queries.js";

import { generatePatientSummaryChart } from "../charts/patientSummary.js";
import { generateStationPlanVsCompletedChart } from "../charts/stationPlanVsCompleted.js";
import { generateNewVsRepeatPieChart } from "../charts/newVsRepeatPie.js";
import { generateArrivalChart } from "../charts/arrivalsByHour.js";
import { generateWaitingTimeChart } from "../charts/waitingByStation.js";
import { generateWaitingHeatmapChart } from "../charts/waitingHeatmap.js";
import { generateVisitTypeChart } from "../charts/visitTypeChart.js";
import { generateDailyVolumeWithObservations } from "../charts/dailyVolumeWithObservations.js";

export const TIMEZONE_OFFSET_MINUTES = 6 * 60;

let db = null;
let Timestamp = null;

export function initDailyEmailDeps({ db: _db, Timestamp: _Timestamp }) {
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

const translationCache = {};

function translateKey(key) {
  if (!key) return key;
  if (translationCache[key]) return translationCache[key];

  const value = key.split(".").reduce((obj, part) => obj?.[part], es) ?? key;
  translationCache[key] = value;
  return value;
}

export async function sendDailyEmails() {
  if (!db || !Timestamp) {
    throw new Error("dailyEmail deps not initialized.");
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

  const DAYS = 14;

  const timeline = computeDailyVolumeTimeline(
    last30DaysSnapshot,
    TIMEZONE_OFFSET_MINUTES,
    DAYS,
  );

  const observations = await fetchOpsObservations({ db, days: DAYS });
  const observationTypes = await fetchObservationTypes({ db });

  const clinicDate = getClinicYMD();

  const observationsForChart = Array.isArray(observations) ? observations : [];

  const observationsForKeyList = [...observationsForChart].sort((a, b) => {
    const at = a?.date?.toMillis ? a.date.toMillis() : 0;
    const bt = b?.date?.toMillis ? b.date.toMillis() : 0;
    if (bt !== at) return bt - at;

    const ay = String(a?.ymd ?? "");
    const by = String(b?.ymd ?? "");
    return by.localeCompare(ay);
  });

  const observationsForInsights = observationsForChart.filter(
    (o) => o?.ymd === clinicDate,
  );

  const dailyVolumeChart = generateDailyVolumeWithObservations({
    labels: timeline.labels,
    volumeData: timeline.values,
    observations: observationsForChart,
    typesById: observationTypes,
    daysLabel: `(últimos ${DAYS} días)`,
  });

  const keyObservationsHTML = renderKeyObservationsHTML({
    top3: observationsForKeyList.slice(0, 3),
    remaining: Math.max(0, observationsForKeyList.length - 3),
    dashboardUrl: null,
    labelForKey: translateKey,
  });

  const historicalHourlyAvg = computeHistoricalHourlyAverages(
    last30DaysSnapshot,
    TIMEZONE_OFFSET_MINUTES,
  );

  const baseInsights = [
    ...detectWaitTimeAnomalies(todaySnapshot, last30DaysSnapshot, thresholds),
    ...detectServiceSuppression(todaySnapshot, last30DaysSnapshot),
    ...detectArrivalSurges(hourlyCounts, historicalHourlyAvg),
    ...detectFlowBottlenecks(todaySnapshot),
    ...detectNewPatientTrends(todaySnapshot, last30DaysSnapshot),
  ];

  const enrichedInsights = attachObservationsToInsights(
    baseInsights,
    observationsForInsights,
  );

  const observationInsights = buildObservationInsights(
    observationsForInsights,
    observationTypes,
  );

  const aiInsights = enrichedInsights.concat(observationInsights);

  await persistInsights({ db, Timestamp }, enrichedInsights, clinicDate);

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
      dailyVolumeChart,
      keyObservationsHTML,
    },
    insightsHTML,
    totals: { totalPatients },
    milestone: { nextMilestone, projectedDateStr },
  });

  const results = [];

  for (const { email } of recipients) {
    try {
      await sendEmail({
        to: email,
        subject: "Informe Diario de Pacientes",
        html,
        attachments: [],
      });

      console.log(`Email sent to ${email}`);
      results.push({ email, status: "sent" });
    } catch (error) {
      const msg = error?.message ?? String(error);
      console.error(`Failed to send email to ${email}: ${msg}`);
      results.push({ email, status: "failed", error: msg });
    }
  }

  return results;
}
