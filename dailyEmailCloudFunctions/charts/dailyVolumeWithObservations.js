"use strict";

module.exports = function generateDailyVolumeWithObservations({
  labels, // ["YYYY-MM-DD", ...] in order
  volumeData, // [number, ...] aligned to labels
  observations, // ops_observations docs (need at least ymd, date, typeId, notes)
  typesById = {}, // { [typeId]: { impact, sortOrder, labelKey, ... } }
  title = "Volumen Diario de Pacientes",
  laneTitle = "Observaciones",
  daysLabel = "", // optional suffix like "(últimos 14 días)"
  showLegend = false, // keep false for clean email look
  showLaneTitle = false, // NEW: hide the lane label by default
}) {
  const { createCanvas } = require("canvas");
  const Chart = require("chart.js/auto");

  // --- Match other email charts: 800px wide static canvas ---
  const width = 800;

  // Lane sizing / spacing
  const laneHeight = 62;
  const lanePadTop = 14; // breathing room between x-axis labels and lane
  const lanePadBottom = showLegend ? 26 : 12; // space below lane

  // Slightly taller canvas so the lane never collides with the bottom edge
  const height = 520;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const safeLabels = Array.isArray(labels) ? labels : [];
  const safeVolume = Array.isArray(volumeData) ? volumeData : [];
  const safeObs = Array.isArray(observations) ? observations : [];

  // Group observations by ymd and attach type + dateMs for sorting
  const obsByYmd = groupObservationsByYmd(safeObs, typesById);

  const lanePoints = safeLabels.map((ymd) => {
    const events = obsByYmd.get(ymd) ?? [];

    // Sort within day: higher sortOrder first, then newer
    events.sort((a, b) => {
      const soA = a.type?.sortOrder ?? 0;
      const soB = b.type?.sortOrder ?? 0;
      if (soB !== soA) return soB - soA;
      return (b.dateMs ?? 0) - (a.dateMs ?? 0);
    });

    return { ymd, events };
  });

  // Debug after lanePoints exists (safe)
  const totalEvents = lanePoints.reduce(
    (sum, p) => sum + (p.events?.length ?? 0),
    0,
  );
  // eslint-disable-next-line no-console
  console.log("dailyVolumeWithObservations: matched events =", totalEvents);

  // Reserve space below chart area for lane + breathing room
  const bottomPad = laneHeight + lanePadTop + lanePadBottom;

  const lanePlugin = makeObservationLanePlugin({
    laneHeight,
    laneTitle,
    lanePoints,
    showLegend,
    showLaneTitle,
    lanePadTop,
    lanePadBottom,
  });

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: safeLabels.map(formatShortDate),
      datasets: [
        {
          label: "Pacientes",
          data: safeVolume.map((n) => Number(n ?? 0)),
          backgroundColor: "#009688",
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: false,
      devicePixelRatio: 2,
      animation: false, // deterministic for email
      layout: { padding: { top: 10, left: 10, right: 10, bottom: bottomPad } },
      plugins: {
        legend: {
          display: !!showLegend,
          labels: { font: { family: "Arial, sans-serif", size: 12 } },
        },
        title: { display: false },
        // If chartjs-plugin-datalabels is registered in your env, disable it
        datalabels: { display: false },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 7,
            font: { family: "Arial, sans-serif", size: 12 },
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(0,0,0,0.08)" },
          ticks: {
            precision: 0,
            font: { family: "Arial, sans-serif", size: 12 },
          },
          title: {
            display: true,
            text: "Pacientes",
            font: { family: "Arial, sans-serif", size: 12, weight: "bold" },
          },
        },
      },
    },
    plugins: [lanePlugin],
  });

  return canvas.toDataURL();

  // ---------------- helpers ----------------

  function groupObservationsByYmd(observationsArr, types) {
    const map = new Map();
    for (const o of observationsArr) {
      const ymd = String(o?.ymd ?? "").trim();
      if (!ymd) continue;

      const typeId = String(o?.typeId ?? "").trim();
      const type = types?.[typeId] ?? null;

      const dateMs =
        typeof o?.date?.toMillis === "function"
          ? o.date.toMillis()
          : o?.date instanceof Date
            ? o.date.getTime()
            : typeof o?.date === "number"
              ? o.date
              : 0;

      const normalized = {
        ...o,
        ymd,
        typeId,
        type,
        dateMs,
      };

      if (!map.has(ymd)) map.set(ymd, []);
      map.get(ymd).push(normalized);
    }
    return map;
  }

  function formatShortDate(ymd) {
    const [Y, M, D] = String(ymd)
      .split("-")
      .map((x) => parseInt(x, 10));
    if (!Y || !M || !D) return ymd;
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${months[M - 1]} ${D}`;
  }

  function makeObservationLanePlugin({
    laneHeight,
    laneTitle,
    lanePoints,
    showLegend,
    showLaneTitle,
    lanePadTop,
    lanePadBottom,
  }) {
    return {
      id: "observationLane",
      afterDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        const xScale = scales.x;
        if (!xScale || !chartArea) return;

        // Place lane just below the chart area (x-axis labels included)
        // and clamp so we never draw outside the canvas.
        let laneTop = chartArea.bottom + lanePadTop;
        const maxBottom = chart.height - lanePadBottom;

        let laneBottom = Math.min(laneTop + laneHeight, maxBottom);

        // If clamped too tight, pull laneTop up so lane keeps its height.
        if (laneBottom - laneTop < laneHeight) {
          laneTop = Math.max(chartArea.bottom + 6, maxBottom - laneHeight);
          laneBottom = Math.min(laneTop + laneHeight, maxBottom);
        }

        // Slight +2px to visually center markers in the lane without a baseline
        const laneMid = Math.round((laneTop + laneBottom) / 2) + 2;

        const maxStack = 3;
        const markerR = 6;
        const stackGap = 14;

        ctx.save();

        // Lane label (optional) — draw inside lane so it doesn't collide with x labels
        if (showLaneTitle && laneTitle) {
          ctx.font = "bold 12px Arial, sans-serif";
          ctx.fillStyle = "rgba(0,0,0,0.75)";
          ctx.textBaseline = "top";
          ctx.fillText(laneTitle, chartArea.left + 4, laneTop + 2);
        }

        // Baseline removed (cleaner + prevents visual overlap)

        // Markers per day
        for (let i = 0; i < lanePoints.length; i++) {
          const { events } = lanePoints[i];
          if (!events || events.length === 0) continue;

          // More reliable for bar/category scales than getPixelForTick
          const x = xScale.getPixelForValue(i);

          const normalized = events.map((e) => ({
            ...e,
            impact: e?.type?.impact ?? "negative",
          }));

          const visible = normalized.slice(0, maxStack);
          const hiddenCount = Math.max(0, normalized.length - visible.length);

          // Draw stacked visible markers
          for (let s = 0; s < visible.length; s++) {
            const ev = visible[s];
            const y = laneMid - s * stackGap;

            const fill =
              ev.impact === "positive"
                ? "rgba(46, 125, 50, 0.95)" // green
                : "rgba(198, 40, 40, 0.95)"; // red

            drawDot(ctx, x, y, markerR, fill);
          }

          // Draw +N pill if needed
          if (hiddenCount > 0) {
            const y = laneMid - visible.length * stackGap;

            const allPositive = normalized.every(
              (e) => e.impact === "positive",
            );
            const allNegative = normalized.every(
              (e) => e.impact !== "positive",
            );
            const pillFill = allPositive
              ? "rgba(46, 125, 50, 0.95)"
              : allNegative
                ? "rgba(198, 40, 40, 0.95)"
                : "rgba(90, 90, 90, 0.90)";

            drawPill(ctx, x, y, `+${hiddenCount}`, pillFill);
          }
        }

        // Optional tiny legend
        if (showLegend) {
          ctx.font = "12px Arial, sans-serif";
          ctx.fillStyle = "rgba(0,0,0,0.70)";
          ctx.textBaseline = "top";
          ctx.fillText(
            "🟢 Favorable   🔴 Desfavorable   +N más",
            chartArea.left,
            laneBottom + 6,
          );
        }

        ctx.restore();
      },
    };
  }

  function drawDot(ctx, x, y, r, fill) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();

    // white outline (email-friendly)
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.stroke();
  }

  function drawPill(ctx, x, y, text, fill) {
    const padX = 8;
    const h = 18;

    ctx.font = "bold 12px Arial, sans-serif";
    const w = ctx.measureText(text).width + padX * 2;

    const left = Math.round(x - w / 2);
    const top = Math.round(y - h / 2);
    const radius = 9;

    ctx.beginPath();
    roundRect(ctx, left, top, w, h, radius);
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.textBaseline = "middle";
    ctx.fillText(text, left + padX, top + h / 2);
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
};
