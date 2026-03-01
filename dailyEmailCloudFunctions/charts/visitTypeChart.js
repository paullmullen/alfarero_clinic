// charts/visitTypeChart.js
"use strict";

module.exports = function generateVisitTypeChart(
  todayCounts,
  avgCounts,
  orderedKeys,
  labelMap = {},
) {
  const { createCanvas } = require("canvas");
  const Chart = require("chart.js/auto");

  const keys = Array.isArray(orderedKeys) ? orderedKeys : [];

  const height = Math.max(400, 40 * keys.length + 120);
  const canvas = createCanvas(800, height);
  const ctx = canvas.getContext("2d");

  const labels = keys.map((code) => labelMap[code] ?? code);

  const todayData = keys.map((code) => todayCounts?.[code] ?? 0);
  const avgData = keys.map((code) => avgCounts?.[code] ?? 0);

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
        dataLabels: { display: false },
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
};
