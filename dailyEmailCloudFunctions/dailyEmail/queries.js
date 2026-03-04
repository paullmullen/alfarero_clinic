// dailyEmail/queries.js
"use strict";

async function fetchTodayPatients({ db, startOfToday, startOfTomorrow }) {
  return await db
    .collection("patients")
    .where("complete", "==", true)
    .where("start_time", ">=", startOfToday)
    .where("start_time", "<", startOfTomorrow)
    .get();
}

async function fetchLast30DaysPatients({ db, startOf30DaysAgoTimestamp }) {
  return await db
    .collection("patients")
    .where("start_time", ">=", startOf30DaysAgoTimestamp)
    .get();
}

async function fetchRecipients({ db }) {
  const usersSnapshot = await db.collection("users").get();
  const recipients = [];

  usersSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data?.permissions?.dailyEmail === true && data.email) {
      recipients.push({
        name: data.name ?? "Compañero",
        email: data.email,
      });
    }
  });

  return recipients;
}

async function fetchStationThresholds({ db }) {
  const snapshot = await db.collection("stats").get();
  const thresholds = {};

  snapshot.forEach((doc) => {
    const data = doc.data() ?? {};
    if (typeof data.max_waiting_time === "number") {
      thresholds[doc.id] = data.max_waiting_time; // seconds
    }
  });

  return thresholds;
}

async function fetchVisitTypeLabelMap({ db }) {
  const snapshot = await db.collection("visit_types").get();
  const labelMap = {};

  snapshot.forEach((doc) => {
    const data = doc.data() ?? {};
    const code = (data.name ?? "").toString().trim();
    const label = (data.visit_type ?? code).toString().trim();
    if (code) labelMap[code] = label;
  });

  return labelMap;
}

async function fetchTotalPatients({ db }) {
  const totalPatientsSnapshot = await db.collection("patients").count().get();
  return totalPatientsSnapshot.data().count;
}

/**
 * NEW: ops observation types (map keyed by typeId)
 * Collection: ops_observation_types
 */
async function fetchObservationTypes({ db }) {
  const snapshot = await db.collection("ops_observation_types").get();
  const typesById = {};

  snapshot.forEach((doc) => {
    const data = doc.data() || {};
    typesById[doc.id] = {
      id: doc.id,
      active: data.active !== false,
      category: data.category || "",
      impact: data.impact || "negative",
      labelKey: data.labelKey || `ops.types.${doc.id}`,
      sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 9999,
    };
  });

  return typesById;
}

// Guatemala is UTC-6 year-round
const TIMEZONE_OFFSET_MINUTES = 6 * 60;

function toLocalYMD(date, timezoneOffsetMinutes) {
  const local = new Date(date.getTime() - timezoneOffsetMinutes * 60 * 1000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, "0");
  const d = String(local.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getYmdRangeForLastNDays(days, timezoneOffsetMinutes) {
  const now = new Date();
  const endYMD = toLocalYMD(now, timezoneOffsetMinutes);

  const start = new Date(now);
  start.setDate(start.getDate() - (Math.max(1, Number(days) || 14) - 1));
  const startYMD = toLocalYMD(start, timezoneOffsetMinutes);

  return { startYMD, endYMD };
}

/**
 * NEW: ops observations for a date range
 * Collection: ops_observations
 *
 * Usage:
 *  - fetchOpsObservations({ db, startYMD, endYMD })
 *  - fetchOpsObservations({ db, days: 14 }) // convenience
 */
async function fetchOpsObservations({
  db,
  startYMD,
  endYMD,
  days = 14,
  limitN = 800,
}) {
  let s = (startYMD || "").toString().trim();
  let e = (endYMD || "").toString().trim();

  if (!s || !e) {
    const range = getYmdRangeForLastNDays(days, TIMEZONE_OFFSET_MINUTES);
    s = range.startYMD;
    e = range.endYMD;
  }

  const snap = await db
    .collection("ops_observations")
    .where("ymd", ">=", s)
    .where("ymd", "<=", e)
    .orderBy("ymd", "desc")
    .limit(limitN)
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
}

module.exports = {
  fetchTodayPatients,
  fetchLast30DaysPatients,
  fetchRecipients,
  fetchStationThresholds,
  fetchVisitTypeLabelMap,
  fetchTotalPatients,

  // NEW
  fetchObservationTypes,
  fetchOpsObservations,
};
