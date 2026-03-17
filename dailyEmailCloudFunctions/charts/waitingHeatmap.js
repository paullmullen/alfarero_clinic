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
      const v = raw?.v ?? 0;

      if (!element || !raw || !v) return;

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
    timezoneOffsetMinutes = 0,
    topN = 10,
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

  const stationHourMap = {};
  const stationLabels = new Set();
  const hourLabels = new Set();

  let totalSteps = 0;
  let included = 0;
  let noTimestamp = 0;
  let noWaitingTime = 0;
  let badStatus = 0;
  let outOfRange = 0;

  const validStatus = includeInProgress
    ? new Set(["complete", "in_process", "queued"])
    : new Set(["complete"]);

  const start = startOfToday
    ? startOfToday.toDate
      ? startOfToday.toDate()
      : startOfToday
    : null;

  const end = startOfTomorrow
    ? startOfTomorrow.toDate
      ? startOfTomorrow.toDate()
      : startOfTomorrow
    : null;

  patientsSnapshot.forEach((doc) => {
    const data = doc.data();
    const plan = data.plan_of_care ?? [];

    for (const step of plan) {
      totalSteps++;

      const hasTimestamp = !!step?.waiting_start?.toDate;
      if (!hasTimestamp) {
        noTimestamp++;
        continue;
      }

      const ws = step.waiting_start.toDate();

      const hasTime =
        typeof step?.waiting_time === "number" &&
        !Number.isNaN(step.waiting_time);

      if (!hasTime) {
        noWaitingTime++;
        continue;
      }

      if (!validStatus.has(step?.status)) {
        badStatus++;
        continue;
      }

      if (start && end && !(ws >= start && ws < end)) {
        outOfRange++;
        continue;
      }

      const localStart = new Date(
        ws.getTime() - timezoneOffsetMinutes * 60 * 1000,
      );
      const hour = localStart.getHours();

      const station = step.station ?? "unknown";
      const key = `${station}_${hour}`;

      if (!stationHourMap[key]) stationHourMap[key] = [];

      const minutes = step.waiting_time / 60;
      stationHourMap[key].push(minutes);

      stationLabels.add(station);
      hourLabels.add(hour);
      included++;
    }
  });

  const stations = Array.from(stationLabels).sort();
  const hours = Array.from(hourLabels).sort((a, b) => a - b);

  const dataMatrixLocal = stations.map((station) =>
    hours.map((hour) => {
      const key = `${station}_${hour}`;
      const times = stationHourMap[key] ?? [];
      if (times.length === 0) return 0;

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      return showDecimalMinutes ? parseFloat(avg.toFixed(1)) : Math.round(avg);
    }),
  );

  const labeledStations = stations.map(
    (s) => `${s} [${((thresholds?.[s] ?? 900) / 60).toFixed(0)} mins]`,
  );

  if (debug) {
    const header = "[WaitingHeatmap Diagnostics]";
    console.log(`${header} Steps (total=${totalSteps})`);
    console.log(
      `${header} Included=${included}, Excluded: noTimestamp=${noTimestamp}, noWaitingTime=${noWaitingTime}, badStatus=${badStatus}, outOfRange=${outOfRange}`,
    );

    if (start && end) {
      console.log(
        `${header} Day window: start=${start.toISOString()} end=${end.toISOString()}`,
      );
    } else {
      console.log(`${header} Day window not applied`);
    }

    console.log(
      `${header} Distinct stations: ${stations.length} -> [${stations.join(", ")}]`,
    );
    console.log(
      `${header} Distinct hours: ${hours.length} -> [${hours.join(", ")}]`,
    );
  }

  new Chart(ctx, {
    type: "matrix",
    plugins: [CellLabelPlugin],
    data: {
      datasets: [
        {
          label: "Tiempo de espera",
          data: dataMatrixLocal.flatMap((row, i) =>
            row.map((value, j) => ({
              x: `${hours[j]}:00`,
              y: labeledStations[i],
              v: value,
            })),
          ),
          backgroundColor: (ctx) => {
            const dataPoint = ctx?.dataset?.data?.[ctx.dataIndex];
            const value = dataPoint?.v ?? 0;
            const stationLabel = dataPoint?.y ?? "";
            const station = stationLabel.split(" [")[0];
            const maxValue = thresholds?.[station] ?? 900;

            if (value === 0) return "rgba(255,255,255,1)";

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
