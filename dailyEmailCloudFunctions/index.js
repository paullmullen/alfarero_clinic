const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const axios = require("axios");

// Initialize Firebase Admin SDK
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

// Constants
const SEND_EMAIL_URL = "https://sendemail-479287307088.us-central1.run.app";
const TIMEZONE_OFFSET_MINUTES = 6 * 60; // UTC-6

function getLocalDayRangeTimestamps() {
  const now = new Date();

  const startOfTodayLocal = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1
  );
  const startOfTodayUTC = new Date(
    startOfTodayLocal.getTime() + TIMEZONE_OFFSET_MINUTES * 60 * 1000
  );

  const startOfTomorrowLocal = new Date(startOfTodayLocal);
  startOfTomorrowLocal.setDate(startOfTomorrowLocal.getDate() + 1);
  const startOfTomorrowUTC = new Date(
    startOfTomorrowLocal.getTime() + TIMEZONE_OFFSET_MINUTES * 60 * 1000
  );

  return {
    startOfToday: Timestamp.fromDate(startOfTodayUTC),
    startOfTomorrow: Timestamp.fromDate(startOfTomorrowUTC),
  };
}

function classifyServices(planOfCare) {
  const services = new Set();

  for (const entry of planOfCare || []) {
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
    }
  }

  return services;
}

async function getPatientInsights() {
  const now = new Date();
  const { startOfToday, startOfTomorrow } = getLocalDayRangeTimestamps();

  const startOf30DaysAgoLocal = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  startOf30DaysAgoLocal.setDate(startOf30DaysAgoLocal.getDate() - 30);
  const startOf30DaysAgoUTC = new Date(
    startOf30DaysAgoLocal.getTime() + TIMEZONE_OFFSET_MINUTES * 60 * 1000
  );
  const startOf30DaysAgoTimestamp = Timestamp.fromDate(startOf30DaysAgoUTC);

  const todaySnapshot = await db
    .collection("patients")
    .where("start_time", ">=", startOfToday)
    .where("start_time", "<", startOfTomorrow)
    .get();

  const last30DaysSnapshot = await db
    .collection("patients")
    .where("start_time", ">=", startOf30DaysAgoTimestamp)
    .get();

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
      data.start_time.toDate().getTime() - TIMEZONE_OFFSET_MINUTES * 60 * 1000
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

  return {
    todayCounts,
    avgCounts,
  };
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
    projectedDate.getDate() + Math.round(calendarDaysNeeded)
  );
  const projectedDateStr = projectedDate.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return { nextMilestone, projectedDateStr, patientsRemaining };
}

async function sendDailyEmails() {
  const usersSnapshot = await db.collection("users").get();
  const recipients = [];

  usersSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data?.permissions?.dailyEmail === true && data.email) {
      recipients.push({
        name: data.name || "Compañero",
        email: data.email,
      });
    }
  });

  if (recipients.length === 0) {
    console.log("No users with dailyEmail permission found.");
    return [];
  }

  const insights = await getPatientInsights();

  const totalPatientsSnapshot = await db.collection("patients").count().get();
  const totalPatients = totalPatientsSnapshot.data().count;

  const { nextMilestone, projectedDateStr } = getMilestoneProjection(
    totalPatients,
    insights.avgCounts.total
  );

  const html = `
    <p>Estimado Compañero,</p>
<p>A continuación se presenta un resumen de los servicios brindados hoy y el promedio diario de los últimos 30 días:</p>
<table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
  <thead>
    <tr>
      <th style="width: 120px;"></th>
      <th style="width: 120px;">Total</th>
      <th style="width: 120px;">Pediatría</th>
      <th style="width: 120px;">Clínica General</th>
      <th style="width: 120px;">Fisioterapia</th>
      <th style="width: 120px;">Odontología</th>
      <th style="width: 120px;">Laboratorio</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Pacientes Hoy</strong></td>
      <td>${insights.todayCounts.total.toLocaleString("en-US")}</td>
      <td>${insights.todayCounts.pediatria.toLocaleString("en-US")}</td>
      <td>${insights.todayCounts.clinica_general.toLocaleString("en-US")}</td>
      <td>${insights.todayCounts.fisioterapia.toLocaleString("en-US")}</td>
      <td>${insights.todayCounts.odontologia.toLocaleString("en-US")}</td>
      <td>${insights.todayCounts.laboratorio.toLocaleString("en-US")}</td>
    </tr>
    <tr>
      <td><strong>Promedio Diario (últimos 30 días)</strong></td>
      <td>${insights.avgCounts.total.toFixed(1).toLocaleString("en-US")}</td>
      <td>${insights.avgCounts.pediatria
        .toFixed(1)
        .toLocaleString("en-US")}</td>
      <td>${insights.avgCounts.clinica_general
        .toFixed(1)
        .toLocaleString("en-US")}</td>
      <td>${insights.avgCounts.fisioterapia
        .toFixed(1)
        .toLocaleString("en-US")}</td>
      <td>${insights.avgCounts.odontologia
        .toFixed(1)
        .toLocaleString("en-US")}</td>
      <td>${insights.avgCounts.laboratorio
        .toFixed(1)
        .toLocaleString("en-US")}</td>
    </tr>
  </tbody>
</table>
<br/>
<p>Hasta la fecha se han atendido <strong>${totalPatients.toLocaleString(
    "en-US"
  )}</strong> pacientes.</p>
<p>A este ritmo, habrán atendido a <strong>${nextMilestone.toLocaleString(
    "en-US"
  )}</strong> pacientes para el <strong>${projectedDateStr}</strong>.</p>
<p>¡Cristo Vive!<br/><br/>Josué Rivas,<br/>Gerente</p>

  `;

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
      const status = error.response?.status || "unknown";
      const msg = error.response?.statusText || error.message;
      console.error(`Failed to send email to ${email}: [${status}] ${msg}`);
      results.push({ email, status: "failed", error: msg });
    }
  }

  return results;
}

exports.manualDailyEmail = onRequest(
  { timeoutSeconds: 60 },
  async (req, res) => {
    try {
      const results = await sendDailyEmails();
      res
        .status(200)
        .json({ message: `Sent ${results.length} emails.`, results });
    } catch (err) {
      console.error("Unhandled error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

exports.scheduledDailyEmail = onSchedule(
  {
    schedule: "0 18 * * *",
    timeZone: "America/Guatemala",
    timeoutSeconds: 60,
  },
  async () => {
    console.log("Scheduled daily email triggered.");
    try {
      await sendDailyEmails();
    } catch (err) {
      console.error("Scheduled function failed:", err);
    }
  }
);
