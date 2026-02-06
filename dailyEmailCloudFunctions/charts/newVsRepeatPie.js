// charts/newVsRepeatPie.js
"use strict";

module.exports = function generateNewVsRepeatPieChart(todaySnapshot) {
  const { createCanvas } = require("canvas");
  const Chart = require("chart.js/auto");
  const ChartDataLabels = require("chartjs-plugin-datalabels");

  // MUST register inside the function for gcloud
  Chart.register(ChartDataLabels);

  let newCount = 0;
  let repeatCount = 0;

  todaySnapshot.forEach((doc) => {
    const data = doc.data() ?? {};
    if (data.new_patient === true) newCount++;
    else repeatCount++;
  });

  const total = newCount + repeatCount || 1;

  const canvas = createCanvas(600, 350);
  const ctx = canvas.getContext("2d");

  new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Nuevos", "Repetidos"],
      datasets: [
        {
          data: [newCount, repeatCount],
          backgroundColor: ["#3367D6", "#FF7043"],
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "Pacientes: Nuevos vs Repetidos (Hoy)",
        },
        legend: {
          display: true,
          position: "right",
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const value = ctx.parsed ?? 0;
              const pct = ((value / total) * 100).toFixed(1);
              return `${ctx.label}: ${value} (${pct}%)`;
            },
          },
        },
        datalabels: {
          color: "#fff",
          font: {
            weight: "bold",
            size: 14,
          },
          formatter: (value) => {
            if (!value) return null;
            const pct = ((value / total) * 100).toFixed(0);
            return `${value}\n${pct}%`;
          },
        },
      },
    },
  });

  return canvas.toDataURL();
};
