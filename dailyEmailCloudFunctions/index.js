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

const { createCanvas } = require("canvas");
const Chart = require("chart.js/auto");

function generatePatientSummaryChart(todayCounts, avgCounts) {
  const canvas = createCanvas(800, 400);
  const ctx = canvas.getContext("2d");

  // Mapea etiqueta visible ↔ clave en los objetos de conteo
  const series = [
    { label: "Total", key: "total" },
    { label: "Pediatría", key: "pediatria" },
    { label: "Clínica General", key: "clinica_general" },
    { label: "Fisioterapia", key: "fisioterapia" },
    { label: "Odontología", key: "odontologia" },
    { label: "Laboratorio", key: "laboratorio" },
  ];

  const labels = series.map((s) => s.label);
  const todayData = series.map((s) => Number(todayCounts[s.key] ?? 0));
  const avgData = series.map((s) => Number(avgCounts[s.key] ?? 0));

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Pacientes Hoy", data: todayData, backgroundColor: "#009688" },
        {
          label: "Promedio Diario (últimos 30 días)",
          data: avgData,
          backgroundColor: "#FF7043",
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: true },
        title: { display: true, text: "Resumen de Pacientes por Servicio" },
      },
      scales: {
        x: { title: { display: true, text: "Servicio" } },
        y: {
          title: { display: true, text: "Número de pacientes" },
          beginAtZero: true,
        },
      },
    },
  });

  return canvas.toDataURL();
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

  return canvas.toDataURL(); // base64 image string
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
    const plan = data.plan_of_care ?? [];
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
      const times = stationHourMap[key] ?? [];
      return times.length > 0
        ? parseFloat(
            (times.reduce((a, b) => a + b, 0) / times.length).toFixed(0)
          )
        : 0;
    })
  );

  const labeledStations = stations.map(
    (s) => `${s} [${(thresholds[s] / 60).toFixed(0)} mins]`
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
              y: labeledStations[i],
              v: value,
            }))
          ),
          backgroundColor: function (ctx) {
            const dataPoint = ctx?.dataset?.data?.[ctx.dataIndex];
            const value = dataPoint?.v ?? 0;
            // Extract base station name from label like "lab [15]"
            const stationLabel = dataPoint?.y ?? "";
            const station = stationLabel.split(" [")[0]; // gets "lab" from "lab [15]"
            const maxValue = thresholds[station] ?? 900;
            if (value === 0) return "rgba(255,255,255,1)";
            if (value * 60 <= maxValue) {
              const ratio = (value * 60) / maxValue;
              const green = Math.floor(200 + 55 * ratio);
              const red = Math.floor(100 * (1 - ratio));
              return `rgba(${red}, ${green}, 0, 0.8)`;
            } else {
              const ratio = Math.min(1, (value * 60 - maxValue) / maxValue);
              const red = Math.floor(200 + 55 * ratio);
              const green = Math.floor(100 * (1 - ratio));
              return `rgba(${red}, ${green}, 0, 0.8)`;
            }
          },
          borderColor: "black",
          borderWidth: 1,
          barPercentage: 1.0,
          categoryPercentage: 1.0,
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
          font: { weight: "bold", size: 10 },
          formatter: (value) => {
            return value.v > 0 ? value.v.toFixed(0) : ""; // solo mostrar si > 0
          },
        },
      },
      scales: {
        x: {
          type: "category",
          labels: hours.map((h) => `${h}:00`),
          title: { display: true, text: "Hora del día", padding: { top: 20 } },
          ticks: {
            padding: 10,
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0,
          },
        },
        y: {
          type: "category",
          labels: labeledStations,
          title: { display: true, text: "Servicio", padding: { top: 20 } },
          ticks: { padding: 10 },
        },
      },
    },
  });

  return canvas.toDataURL(); // base64 image string
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
    const plan = data.plan_of_care ?? [];
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

  return canvas.toDataURL(); // base64 image string
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
  for (const entry of planOfCare ?? []) {
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

  return { todayCounts, avgCounts };
}

/* ========= NUEVO: métricas y gráfica por type_of_visit ========= */

function getVisitTypeMetrics(todaySnapshot, last30DaysSnapshot) {
  // Contadores de hoy
  const todayCounts = {};
  todaySnapshot.forEach((doc) => {
    const data = doc.data();
    const vtype = (data.type_of_visit ?? "desconocido").toString();
    todayCounts[vtype] = (todayCounts[vtype] ?? 0) + 1;
  });

  // Contadores de últimos 30 días + días únicos con pacientes
  const lastCounts = {};
  const uniqueDateSet = new Set();
  if (last30DaysSnapshot) {
    last30DaysSnapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.start_time) return;
      const localDate = new Date(
        data.start_time.toDate().getTime() - TIMEZONE_OFFSET_MINUTES * 60 * 1000
      );
      const dateKey = localDate.toISOString().split("T")[0];
      uniqueDateSet.add(dateKey);

      const vtype = (data.type_of_visit ?? "desconocido").toString();
      lastCounts[vtype] = (lastCounts[vtype] ?? 0) + 1;
    });
  }

  const daysWithPatients = uniqueDateSet.size || 1;
  const avg30Counts = {};
  for (const key of Object.keys(lastCounts)) {
    avg30Counts[key] = lastCounts[key] / daysWithPatients;
  }

  // Orden por volumen Hoy (desc), si no existe Hoy, usa Promedio 30d
  const allKeys = Array.from(
    new Set([...Object.keys(todayCounts), ...Object.keys(avg30Counts)])
  );
  allKeys.sort((a, b) => {
    const av = todayCounts[a] ?? avg30Counts[a] ?? 0;
    const bv = todayCounts[b] ?? avg30Counts[b] ?? 0;
    return bv - av;
  });

  return { todayCounts, avg30Counts, orderedKeys: allKeys };
}

async function getVisitTypeLabelMap() {
  const snapshot = await db.collection("visit_types").get();
  const labelMap = {};
  snapshot.forEach((doc) => {
    const data = doc.data() ?? {};
    const code = (data.name ?? "").toString().trim();
    const label = (data.visit_type ?? code).toString().trim(); // fallback al código si falta la descripción
    if (code) labelMap[code] = label;
  });
  return labelMap;
}

function generateVisitTypeChart(
  todayCounts,
  avgCounts,
  orderedKeys,
  labelMap = {}
) {
  const { createCanvas } = require("canvas");
  const Chart = require("chart.js/auto");

  const height = Math.max(400, 40 * (orderedKeys?.length ?? 0) + 120);
  const canvas = createCanvas(800, height);
  const ctx = canvas.getContext("2d");

  // Mapear códigos (orderedKeys) a descripciones legibles usando Firestore
  const labels = (orderedKeys ?? []).map((code) => labelMap[code] ?? code);

  const todayData = labels.map((_, i) => {
    const k = orderedKeys[i]; // mantener métricas por el código original
    return todayCounts[k] ?? 0;
  });
  const avgData = labels.map((_, i) => {
    const k = orderedKeys[i];
    return avgCounts[k] ?? 0;
  });

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Visitas Hoy", data: todayData, backgroundColor: "#3367D6" },
        {
          label: "Promedio Diario (últimos 30 días)",
          data: avgData,
          backgroundColor: "#FF7043",
        },
      ],
    },
    options: {
      responsive: false,
      indexAxis: "y",
      plugins: {
        legend: { display: true },
        title: {
          display: true,
          text: "Visitas por Tipo (Hoy vs Promedio 30 días)",
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed.x ?? 0;
              // (Opcional) mostrar el código original junto con la etiqueta humana:
              // const code = orderedKeys[ctx.dataIndex];
              // return `${ctx.dataset.label}: ${v.toLocaleString("en-US")} (${code})`;
              return `${ctx.dataset.label}: ${v.toLocaleString("en-US")}`;
            },
          },
        },
        datalabels: { display: false },
      },
      scales: {
        x: {
          title: { display: true, text: "Número de visitas" },
          beginAtZero: true,
        },
        y: {
          title: { display: true, text: "Tipo de visita" },
          ticks: { autoSkip: false },
        },
      },
    },
  });

  return canvas.toDataURL();
}
``;

/* ========= FIN NUEVO ========= */

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

  if (todaySnapshot.empty) {
    return [];
  }

  // Conteo por hora (hoy)
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

  // Obtener snapshot de últimos 30 días (para promedios por type_of_visit)
  const now = new Date();
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

  const last30DaysSnapshot = await db
    .collection("patients")
    .where("start_time", ">=", startOf30DaysAgoTimestamp)
    .get();

  // Destinatarios
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

  if (recipients.length === 0) {
    console.log("No users with dailyEmail permission found.");
    return [];
  }

  const insights = await getPatientInsights();
  const patientSummaryChart = generatePatientSummaryChart(
    insights.todayCounts,
    insights.avgCounts
  );

  // NUEVO: métricas y gráfica por type_of_visit

  const {
    todayCounts: visitTodayCounts,
    avg30Counts: visitAvgCounts,
    orderedKeys,
  } = getVisitTypeMetrics(todaySnapshot, last30DaysSnapshot);

  const visitTypeLabelMap = await getVisitTypeLabelMap(); // ← function call; variable holds the result

  const visitTypeChart = generateVisitTypeChart(
    visitTodayCounts,
    visitAvgCounts,
    orderedKeys,
    visitTypeLabelMap
  );

  const totalPatientsSnapshot = await db.collection("patients").count().get();
  const totalPatients = totalPatientsSnapshot.data().count + 4074; // pacientes pre-sistema

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
  <img src="https://firebasestorage.googleapis.com/v0/b/alfarero-478ad.appspot.com/o/full_logo.png?alt=media&token=11098abc-ae65-440e-8bfd-b345f65be332" />
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
<img src="${patientSummaryChart}" />

<br/><br/>
<img src="${visitTypeChart}" />

<br/><br/>
<img src="${arrivalChart}" />
<br/><br/>
<img src="${waitingChart}" />
<br/><br/>
<img src="${waitingHeatmap}" />

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
      const status = error.response?.status ?? "unknown";
      const msg = error.response?.statusText ?? error.message;
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
