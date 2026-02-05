// charts/newVsRepeatPie.js
"use strict";

module.exports = function generateNewVsRepeatPieChart(todaySnapshot) {
  const { createCanvas } = require("canvas");
  const Chart = require("chart.js/auto");

  let newCount = 0;
  let repeatCount = 0;

  todaySnapshot.forEach((doc) => {
    const data = doc.data() ?? {};
    if (data.new_patient === true) newCount++;
    else repeatCount++;
  });

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
        title: { display: true, text: "Pacientes: Nuevos vs Repetidos (Hoy)" },
        legend: { display: true, position: "right" },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const value = ctx.parsed ?? 0;
              const total = newCount + repeatCount || 1;
              const pct = ((value / total) * 100).toFixed(1);
              return `${ctx.label}: ${value} (${pct}%)`;
            },
          },
        },
      },
    },
  });

  return canvas.toDataURL();
};
