// charts/patientSummary.js
"use strict";

module.exports = function generatePatientSummaryChart(todayCounts, avgCounts) {
  const { createCanvas } = require("canvas");
  const Chart = require("chart.js/auto");

  const canvas = createCanvas(800, 400);
  const ctx = canvas.getContext("2d");

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
};
