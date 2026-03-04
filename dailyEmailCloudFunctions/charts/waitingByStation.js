// charts/waitingByStation.js
"use strict";

module.exports = function generateWaitingTimeChart(patientsSnapshot) {
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
        stationTotals[station] += step.waiting_time / 60; // seconds → minutes
        stationCounts[station] += 1;
      }
    }
  });

  const labels = Object.keys(stationTotals);
  const data = labels.map(
    (station) => +(stationTotals[station] / stationCounts[station]).toFixed(2),
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
      devicePixelRatio: 2,
      responsive: false,
      plugins: {
        legend: { display: false },
        title: { display: false },
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

  return canvas.toDataURL();
};
