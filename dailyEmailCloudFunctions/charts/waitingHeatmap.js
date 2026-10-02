import { buildWaitingHeatmapData } from "./waitingHeatmapData.js";
import { createCanvas } from "canvas";
import Chart from "chart.js/auto";
import * as Matrix from "chartjs-chart-matrix";
import { CategoryScale, LinearScale } from "chart.js";

const CellLabelPlugin = {
  id: "cellLabels",
  afterDatasetsDraw(chart, _args, pluginOptions) {
    const {
      showDecimalMinutes = true,
      color = "black",
      fontSize = 10,
      fontWeight = "bold",
    } = pluginOptions || {};

    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const dataset = chart.data?.datasets?.[0];
    const data = dataset?.data ?? [];

    if (!meta?.data?.length) return;

    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `${fontWeight} ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    meta.data.forEach((element, index) => {
      const raw = data[index];
      const v = raw?.v;

      if (!element || !Number.isFinite(v)) return;

      const props = element.getProps(["x", "y", "width", "height"], true);

      const x = props.x + props.width / 2;
      const y = props.y + props.height / 2;

      if (
        typeof x !== "number" ||
        typeof y !== "number" ||
        Number.isNaN(x) ||
        Number.isNaN(y)
      ) {
        return;
      }

      const label = showDecimalMinutes
        ? v.toFixed(1)
        : Math.round(v).toString();
      ctx.fillText(label, x, y);
    });

    ctx.restore();
  },
};

export function generateWaitingHeatmapChart(
  patientsSnapshot,
  {
    thresholds = null,
    debug = false,
    includeInProgress = false,
    startOfToday = null,
    startOfTomorrow = null,
    timezoneOffsetMinutes = 360,
    showDecimalMinutes = true,
  } = {},
) {
  Chart.register(
    Matrix.MatrixController,
    Matrix.MatrixElement,
    CategoryScale,
    LinearScale,
  );

  const canvas = createCanvas(800, 400);
  const ctx = canvas.getContext("2d");

  const { stations, hours, values, counts, diagnostics } = buildWaitingHeatmapData(
    patientsSnapshot,
    { includeInProgress, startOfToday, startOfTomorrow,
      timezoneOffsetMinutes, showDecimalMinutes },
  );
  const labeledStations = stations.map(
    (s) => `${s} [${((thresholds?.[s] ?? 900) / 60).toFixed(0)} mins]`,
  );
  if (debug) console.log("[WaitingHeatmap Diagnostics]", diagnostics);

  new Chart(ctx, {
    type: "matrix",
    plugins: [CellLabelPlugin],
    data: {
      datasets: [
        {
          label: "Tiempo de espera",
          data: values.flatMap((row, i) =>
            row.map((value, j) => ({
              x: `${hours[j]}:00`,
              y: labeledStations[i],
              v: value,
              count: counts[i][j],
            })),
          ),
          backgroundColor: (ctx) => {
            const dataPoint = ctx?.dataset?.data?.[ctx.dataIndex];
            const value = dataPoint?.v;
            const stationLabel = dataPoint?.y ?? "";
            const station = stationLabel.split(" [")[0];
            const maxValue = thresholds?.[station] ?? 900;

            if (!Number.isFinite(value)) return "rgba(255,255,255,1)";

            if (value * 60 <= maxValue) {
              const ratio = (value * 60) / maxValue;
              const green = Math.floor(200 + 55 * ratio);
              const red = Math.floor(100 * (1 - ratio));
              return `rgba(${red}, ${green}, 0, 0.8)`;
            }

            const ratio = Math.min(1, (value * 60 - maxValue) / maxValue);
            const red = Math.floor(200 + 55 * ratio);
            const green = Math.floor(100 * (1 - ratio));
            return `rgba(${red}, ${green}, 0, 0.8)`;
          },
          borderColor: "black",
          borderWidth: 1,
          width: (ctx) => {
            const chartArea = ctx.chart.chartArea;
            if (!chartArea) return 0;
            return chartArea.width / Math.max(1, hours.length);
          },
          height: (ctx) => {
            const chartArea = ctx.chart.chartArea;
            if (!chartArea) return 0;
            return chartArea.height / Math.max(1, stations.length) - 2;
          },
        },
      ],
    },
    options: {
      devicePixelRatio: 2,
      responsive: false,
      animation: false,
      layout: { padding: { top: 10, right: 10, bottom: 24, left: 10 } },
      plugins: {
        title: { display: false },
        legend: { display: false },
        datalabels: false,
        cellLabels: {
          showDecimalMinutes,
          color: "black",
          fontSize: 10,
          fontWeight: "bold",
        },
      },
      scales: {
        x: {
          type: "category",
          labels: hours.map((h) => `${h}:00`),
          position: "bottom",
          offset: true,
          title: { display: true, text: "Hora del día", padding: { top: 20 } },
          ticks: {
            padding: 10,
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0,
          },
          grid: { drawTicks: true },
        },
        y: {
          type: "category",
          labels: labeledStations,
          offset: true,
          title: { display: true, text: "Servicio", padding: { top: 20 } },
          ticks: { padding: 10 },
          grid: { drawTicks: true },
        },
      },
    },
  });

  return canvas.toDataURL();
}

