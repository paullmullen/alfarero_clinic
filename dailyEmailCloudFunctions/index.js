const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const axios = require("axios");

// Initialize Firebase Admin SDK
initializeApp({ credential: applicationDefault() });
const db = getFirestore();
let dataMatrix = null;

// Constants
const SEND_EMAIL_URL = "https://sendemail-479287307088.us-central1.run.app";
const TIMEZONE_OFFSET_MINUTES = 6 * 60; // UTC-6
let thresholds = null;

async function getStationThresholds() {
  const snapshot = await db.collection("stats").get();
  const thresholds = {};
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (typeof data.max_waiting_time === "number") {
      thresholds[doc.id] = data.max_waiting_time;
    }
  });
  return thresholds;
}

function generateArrivalChart(hourlyCounts) {
  const { createCanvas } = require("canvas");
  const Chart = require("chart.js/auto");

  const canvas = createCanvas(800, 400);
  const ctx = canvas.getContext("2d");

  const labels = Object.keys(hourlyCounts).map((h) => `${h}:00`);
  const data = Object.values(hourlyCounts);

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Pacientes por hora (hoy)",
          data,
          backgroundColor: "#009688",
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Pacientes por hora (hoy)",
        },
      },
      scales: {
        x: { title: { display: true, text: "Hora del día" } },
        y: {
          title: { display: true, text: "Número de pacientes" },
          beginAtZero: true,
        },
      },
    },
  });

  return canvas.toDataURL(); // returns base64 image string
}

function generateWaitingHeatmapChart(patientsSnapshot) {
  const { createCanvas } = require("canvas");
  const Chart = require("chart.js/auto");

  const ChartDataLabels = require("chartjs-plugin-datalabels");
  Chart.register(ChartDataLabels);

  const { MatrixController, MatrixElement } = require("chartjs-chart-matrix");
  const { CategoryScale, LinearScale } = require("chart.js");
  Chart.register(MatrixController, MatrixElement, CategoryScale, LinearScale);

  const canvas = createCanvas(800, 400);
  const ctx = canvas.getContext("2d");

  const stationHourMap = {};
  const stationLabels = new Set();
  const hourLabels = new Set();

  patientsSnapshot.forEach((doc) => {
    const data = doc.data();
    const plan = data.plan_of_care || [];
    for (const step of plan) {
      if (
        step.status === "complete" &&
        typeof step.waiting_time === "number" &&
        step.waiting_start?.toDate
      ) {
        const station = step.station;
        const hour = (step.waiting_start.toDate().getUTCHours() - 6 + 24) % 24;
        const key = `${station}_${hour}`;
        if (!stationHourMap[key]) {
          stationHourMap[key] = [];
        }
        stationHourMap[key].push(step.waiting_time / 60); // convert sec to minutes
        stationLabels.add(station);
        hourLabels.add(hour);
      }
    }
  });

  const stations = Array.from(stationLabels).sort();
  const hours = Array.from(hourLabels).sort((a, b) => a - b);
  dataMatrix = stations.map((station) =>
    hours.map((hour) => {
      const key = `${station}_${hour}`;
      const times = stationHourMap[key] || [];
      return times.length > 0
        ? parseFloat(
            (times.reduce((a, b) => a + b, 0) / times.length).toFixed(0)
          )
        : 0;
    })
  );

  new Chart(ctx, {
    type: "matrix",
    data: {
      datasets: [
        {
          label: "Tiempo de espera",
          data: dataMatrix.flatMap((row, i) =>
            row.map((value, j) => ({
              x: `${hours[j]}:00`,
              y: stations[i],
              v: value,
            }))
          ),
          backgroundColor: function (ctx) {
            const dataPoint = ctx?.dataset?.data?.[ctx.dataIndex];
            const value = dataPoint?.v ?? 0;
            const station = dataPoint?.y;
            const maxValue = thresholds[station] ?? 900; // fallback si no hay umbral

            if (value === 0) return "rgba(255,255,255,1)";
            const ratio = Math.min(1, (value / maxValue) * 60);
            const red = Math.floor(255 * ratio);
            const green = Math.floor(255 * (1 - ratio));
            return `rgba(${red}, ${green}, 0, 0.8)`;
          },

          borderColor: function (ctx) {
            const dataPoint = ctx?.dataset?.data?.[ctx.dataIndex];
            const value = dataPoint?.v ?? 0;
            return value === 0 ? "rgba(255,255,255,0)" : "black";
          },

          width: function (ctx) {
            const chartArea = ctx.chart.chartArea;
            if (!chartArea) {
              return 0; // or some safe default until chartArea is computed
            }
            return chartArea.width / hours.length;
          },
          height: function (ctx) {
            const chartArea = ctx.chart.chartArea;
            if (!chartArea) {
              return 0;
            }
            return chartArea.height / stations.length;
          },
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "Mapa de calor de tiempo de espera por servicio y hora",

          padding: {
            top: 20,
            bottom: 20,
          },
        },
        legend: { display: false },

        datalabels: {
          color: "black",
          font: {
            weight: "bold",
            size: 10,
          },
          formatter: (value) => {
            return value.v > 0 ? value.v.toFixed(0) : ""; // solo mostrar si > 0
          },
        },
      },
      scales: {
        x: {
          type: "category",
          labels: hours.map((h) => `${h}:00`),
          title: { display: true, text: "Hora del día" },

          padding: {
            top: 20,
            bottom: 20,
          },
        },
        y: {
          type: "category",
          labels: stations,
          title: { display: true, text: "Servicio" },

          padding: {
            top: 20,
            bottom: 10,
          },
        },
      },
    },
  });

  return canvas.toDataURL(); // returns base64 image string
}

function generateWaitingTimeChart(patientsSnapshot) {
  const { createCanvas } = require("canvas");
  const Chart = require("chart.js/auto");
  const canvas = createCanvas(800, 400);
  const ctx = canvas.getContext("2d");

  const stationTotals = {};
  const stationCounts = {};

  patientsSnapshot.forEach((doc) => {
    const data = doc.data();
    const plan = data.plan_of_care || [];
    for (const step of plan) {
      if (step.status === "complete" && typeof step.waiting_time === "number") {
        const station = step.station;
        if (!stationTotals[station]) {
          stationTotals[station] = 0;
          stationCounts[station] = 0;
        }
        stationTotals[station] += step.waiting_time / 60; // convert to minutes
        stationCounts[station] += 1;
      }
    }
  });

  const labels = Object.keys(stationTotals);
  const data = labels.map(
    (station) => +(stationTotals[station] / stationCounts[station]).toFixed(2)
  );

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Tiempo promedio de espera (minutos)",
          data,
          backgroundColor: "#0057A0",
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Tiempo promedio de espera por servicio",
        },
      },
      scales: {
        x: { title: { display: true, text: "Servicio" } },
        y: {
          title: { display: true, text: "Minutos de espera" },
          beginAtZero: true,
        },
      },
    },
  });

  return canvas.toDataURL(); // returns base64 image string
}

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
  const { startOfToday, startOfTomorrow } = getLocalDayRangeTimestamps();
  const todaySnapshot = await db
    .collection("patients")
    .where("start_time", ">=", startOfToday)
    .where("start_time", "<", startOfTomorrow)
    .get();

  if (todaySnapshot.count == 0) {
    return [];
  }

  const hourlyCounts = {};
  for (let hour = 7; hour <= 17; hour++) {
    hourlyCounts[hour] = 0;
  }

  todaySnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.start_time) {
      const localDate = new Date(
        data.start_time.toDate().getTime() - TIMEZONE_OFFSET_MINUTES * 60 * 1000
      );
      const hour = localDate.getHours();
      if (hour in hourlyCounts) {
        hourlyCounts[hour]++;
      }
    }
  });

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

  thresholds = await getStationThresholds();
  const arrivalChart = generateArrivalChart(hourlyCounts);
  const waitingChart = generateWaitingTimeChart(todaySnapshot);
  const waitingHeatmap = generateWaitingHeatmapChart(todaySnapshot);

  const html = `

  

  <div style="text-align: center; margin-bottom: 20px;">
    <img src="https://firebasestorage.googleapis.com/v0/b/alfarero-478ad.appspot.com/o/full_logo.png?alt=media&token=11098abc-ae65-440e-8bfd-b345f65be332" alt="El Alfarero Multimédica" style="max-width: 200px;" />
  </div>

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
<p>Tenga en cuenta que el total no equivale a la suma de los servicios. Farmacia, nutrición y otros servicios se incluyen en el total, pero no se reportan en columnas separadas.</p>
<br/><br/>
  <img src="${arrivalChart}" alt="Pacientes por hora (hoy)" />
<br/><br/>
  <img src="${waitingChart}" alt="Pacientes por hora (hoy)" />
  <br/><br/>
    <img src="${waitingHeatmap}" alt="Pacientes por hora (hoy)" />



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
