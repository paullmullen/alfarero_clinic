import { createCanvas } from "canvas";
import Chart from "chart.js/auto";

export function generateStationPlanVsCompletedChart(
  todayData,
  orderedStations,
  stationLabelMap = {},
) {
  const keys = Array.isArray(orderedStations) ? orderedStations : [];

  const height = Math.max(400, 40 * keys.length + 120);
  const canvas = createCanvas(800, height);
  const ctx = canvas.getContext("2d");

  const labels = keys.map((code) => stationLabelMap[code] ?? code);

  const completedData = keys.map((code) => todayData?.completed?.[code] ?? 0);

  const notCompletedData = keys.map(
    (code) => todayData?.notCompleted?.[code] ?? 0,
  );

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Completado",
          data: completedData,
          backgroundColor: "#009688",
        },
        {
          label: "No Completado",
          data: notCompletedData,
          backgroundColor: "#E57373",
        },
      ],
    },
    options: {
      responsive: false,
      devicePixelRatio: 2,
      indexAxis: "y",
      plugins: {
        legend: { display: true },
        title: { display: false },
        datalabels: { display: false },
      },
      scales: {
        x: {
          stacked: true,
          beginAtZero: true,
          title: {
            display: true,
            text: "Número de pacientes",
          },
        },
        y: {
          stacked: true,
          ticks: { autoSkip: false },
        },
      },
    },
  });

  return canvas.toDataURL();
}
