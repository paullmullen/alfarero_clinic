import { createCanvas } from "canvas";
import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { MatrixController, MatrixElement } from "chartjs-chart-matrix";
import { CategoryScale, LinearScale } from "chart.js";

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
  // Register plugins inside function (Cloud Functions safe)
  Chart.register(
    ChartDataLabels,
    MatrixController,
    MatrixElement,
    CategoryScale,
    LinearScale,
  );

  const canvas = createCanvas(800, 400);
  const ctx = canvas.getContext("2d");

  // --- Core accumulators ---
  const stationHourMap = {};
  const stationLabels = new Set();
  const hourLabels = new Set();

  // --- Diagnostics counters ---
  let totalSteps = 0;
  let included = 0;
  let noTimestamp = 0;
  let noWaitingTime = 0;
  let badStatus = 0;
  let outOfRange = 0;

  const validStatus = includeInProgress
    ? new Set(["complete", "in_process, queued"])
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
      return showDecimalMinutes ? parseFloat(avg.toFixed(0)) : Math.round(avg);
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

    const bucketArr = [];
    for (const [key, list] of Object.entries(stationHourMap)) {
      const [st, h] = key.split("_");
      const avg = list.reduce((a, b) => a + b, 0) / list.length;
      bucketArr.push({
        station: st,
        hour: Number(h),
        count: list.length,
        avgMin: avg,
      });
    }

    const topByCount = [...bucketArr]
      .sort(
        (a, b) =>
          b.count - a.count ||
          a.station.localeCompare(b.station) ||
          a.hour - b.hour,
      )
      .slice(0, topN);

    const topByAvg = [...bucketArr]
      .filter((b) => b.count >= 2)
      .sort((a, b) => b.avgMin - a.avgMin || b.count - a.count)
      .slice(0, topN);

    console.log(`${header} Top ${topN} buckets by COUNT:`);
    for (const b of topByCount) {
      console.log(
        `${header}  - ${b.station} @ ${String(b.hour).padStart(2, "0")}:00  count=${b.count}, avg=${b.avgMin.toFixed(
          2,
        )} min`,
      );
    }

    if (topByAvg.length > 0) {
      console.log(`${header} Top ${topN} buckets by AVERAGE (count>=2):`);
      for (const b of topByAvg) {
        console.log(
          `${header}  - ${b.station} @ ${String(b.hour).padStart(2, "0")}:00  avg=${b.avgMin.toFixed(
            2,
          )} min, count=${b.count}`,
        );
      }
    } else {
      console.log(`${header} Top-by-average list is empty.`);
    }
  }

  new Chart(ctx, {
    type: "matrix",
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
          backgroundColor: function (ctx) {
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
            if (!chartArea) return 0;
            return chartArea.width / Math.max(1, hours.length);
          },
          height: function (ctx) {
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
        datalabels: {
          color: "black",
          font: { weight: "bold", size: 10 },
          formatter: (value) => {
            const v = value.v;
            if (v <= 0) return "";
            return showDecimalMinutes ? v.toFixed(1) : Math.round(v).toString();
          },
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
