import { createCanvas } from "canvas";
import Chart from "chart.js/auto";

export function generateArrivalChart(hourlyCounts) {
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
      devicePixelRatio: 2,
      plugins: {
        legend: { display: false },
        title: { display: false },
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

  return canvas.toDataURL();
}
