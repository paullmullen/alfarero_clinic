// dailyEmail/queries.js
"use strict";

async function fetchTodayPatients({ db, startOfToday, startOfTomorrow }) {
  return await db
    .collection("patients")
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

module.exports = {
  fetchTodayPatients,
  fetchLast30DaysPatients,
  fetchRecipients,
  fetchStationThresholds,
  fetchVisitTypeLabelMap,
  fetchTotalPatients,
};
