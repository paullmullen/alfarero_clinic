const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const axios = require("axios");

// Initialize Firebase Admin SDK
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

// Your deployed email-sending function
const SEND_EMAIL_URL = "https://sendemail-479287307088.us-central1.run.app";

// Central Time offset (UTC-6)
const TIMEZONE_OFFSET_MINUTES = 6 * 60;

function getLocalDayRangeTimestamps() {
  const now = new Date();

  // Calculate local midnight today (UTC-6)
  const startOfTodayLocal = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
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

  // Query for today's patients (local-time-adjusted)
  const todaySnapshot = await db
    .collection("patients")
    .where("start_time", ">=", startOfToday)
    .where("start_time", "<", startOfTomorrow)
    .get();

  const patientsToday = todaySnapshot.size;

  // Query for last 30 days
  const last30DaysSnapshot = await db
    .collection("patients")
    .where("start_time", ">=", startOf30DaysAgoTimestamp)
    .get();

  const uniqueDateSet = new Set();
  last30DaysSnapshot.forEach((doc) => {
    const data = doc.data();
    if (!data.start_time) return;

    const localDate = new Date(
      data.start_time.toDate().getTime() - TIMEZONE_OFFSET_MINUTES * 60 * 1000
    );
    const dateKey = localDate.toISOString().split("T")[0]; // YYYY-MM-DD
    uniqueDateSet.add(dateKey);
  });

  const totalPatients = last30DaysSnapshot.size;
  const daysWithPatients = uniqueDateSet.size || 1;
  const avgLast30Days = totalPatients / daysWithPatients;

  return { patientsToday, avgLast30Days };
}

exports.manualDailyEmail = onRequest(
  { timeoutSeconds: 60 },
  async (req, res) => {
    try {
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
        res.status(200).send("No users with dailyEmail permission found.");
        return;
      }

      const insights = await getPatientInsights();

      const html = `
      <p>Estimado Compañero,</p>
      <p>Aquí están los detalles del servicio de Multimédica Alfarero para el día de hoy:</p>
      <ul>
        <li><strong>Pacientes visitantes hoy:</strong> ${
          insights.patientsToday
        }</li>
        <li><strong>Pacientes promedio de los últimos ${
          insights.avgLast30Days === 1 ? "día" : "días"
        }:</strong> ${insights.avgLast30Days.toFixed(1)}</li>
      </ul>
      <p>¡Cristo Vive!<br/>Josué Rivas,<br/>Gerente</p>
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

      res.status(200).json({
        message: `Sent emails to ${recipients.length} users.`,
        results,
      });
    } catch (err) {
      console.error("Unhandled error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);
