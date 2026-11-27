// Force ESM mode
import {} from "module";

// dailyEmail/queries.js

async function fetchTodayPatients({ db, startOfToday, startOfTomorrow }) {
  return await db
    .collection("patients")
    .where("complete", "==", true)
    .where("start_time", ">=", startOfToday)
    .where("start_time", "<", startOfTomorrow)
    .get();
}

async function fetchLast30DaysPatients({ db, startOf30DaysAgoTimestamp, startOfTomorrow }) {
  return await db
    .collection("patients")
    .where("start_time", ">=", startOf30DaysAgoTimestamp)
    .where("start_time", "<", startOfTomorrow)
    .get();
}

async function fetchRecipients({ db }) {
  const [usersSnapshot, observersSnapshot] = await Promise.all([
    db.collection("users").get(),
    db.collection("report_observers").get(),
  ]);
  const recipients = new Map();

  usersSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data?.permissions?.dailyEmail === true && typeof data.email === "string") {
      const email = data.email.trim();
      if (email && !recipients.has(email.toLowerCase())) {
        recipients.set(email.toLowerCase(), { name: data.name ?? "Compañero", email });
      }
    }
  });

  observersSnapshot.forEach((doc) => {
    const { email } = doc.data();
    if (typeof email === "string" && email === doc.id && !recipients.has(email)) {
      recipients.set(email, { name: "Compañero", email });
    }
  });

  return [...recipients.values()];
}

async function fetchStationThresholds({ db }) {
  const snapshot = await db.collection("stats").get();
  const thresholds = {};

  snapshot.forEach((doc) => {
    const data = doc.data() ?? {};
    if (typeof data.max_waiting_time === "number") {
      thresholds[doc.id] = data.max_waiting_time;
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

  console.log(typesById);

  return typesById;
}

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

async function fetchOpsObservations({
  db,
  startYMD,
  endYMD,
  days = 14,
  limitN = 200,
}) {
  let s = (startYMD || "").toString().trim();
  let e = (endYMD || "").toString().trim();

  if (!s || !e) {
    const range = getYmdRangeForLastNDays(days, TIMEZONE_OFFSET_MINUTES);
    s = range.startYMD;
    e = range.endYMD;
  }

  const rows = [];
  let cursor;
  do {
    let query = db.collection("ops_observations")
      .where("ymd", ">=", s).where("ymd", "<=", e)
      .orderBy("ymd", "desc").limit(limitN);
    if (cursor) query = query.startAfter(cursor);
    const snap = await query.get();
    rows.push(...snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) })));
    cursor = snap.size === limitN ? snap.docs.at(-1) : null;
  } while (cursor);
  return rows;
}

export {
  fetchTodayPatients,
  fetchLast30DaysPatients,
  fetchRecipients,
  fetchStationThresholds,
  fetchVisitTypeLabelMap,
  fetchTotalPatients,
  fetchObservationTypes,
  fetchOpsObservations,
};

