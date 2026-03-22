import { createCanvas } from "canvas";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
import Chart from "chart.js/auto";

export function generateDailyVolumeWithObservations({
  labels,
  locationVolumeData,
  locationsById = {},
  volumeData, // legacy fallback
  observations,
  typesById = {},
  title = "Volumen Diario de Pacientes",
  laneTitle = "Observaciones",
  daysLabel = "",
  showLegend = true,
  showLaneTitle = false,
}) {
  const width = 800;

  const laneHeight = 62;
  const lanePadTop = 14;
  const lanePadBottom = showLegend ? 34 : 12;

  const height = 520;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const safeLabels = Array.isArray(labels) ? labels : [];
  const safeObs = Array.isArray(observations) ? observations : [];
  const safeLocationVolumeData = Array.isArray(locationVolumeData)
    ? locationVolumeData
    : [];
  const safeLegacyVolume = Array.isArray(volumeData) ? volumeData : [];

  const obsByYmd = groupObservationsByYmd(safeObs, typesById);

  const lanePoints = safeLabels.map((ymd) => {
    const events = obsByYmd.get(ymd) ?? [];

    events.sort((a, b) => {
      const soA = a.type?.sortOrder ?? 0;
      const soB = b.type?.sortOrder ?? 0;
      if (soB !== soA) return soB - soA;
      return (b.dateMs ?? 0) - (a.dateMs ?? 0);
    });

    return { ymd, events };
  });

  const totalEvents = lanePoints.reduce(
    (sum, p) => sum + (p.events?.length ?? 0),
    0,
  );
  console.log("dailyVolumeWithObservations: matched events =", totalEvents);

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

  const datasets = buildDatasets({
    safeLabels,
    safeLocationVolumeData,
    safeLegacyVolume,
    locationsById,
  });

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: safeLabels.map(formatShortDate),
      datasets,
    },
    options: {
      responsive: false,
      devicePixelRatio: 2,
      animation: false,
      layout: {
        padding: { top: 10, left: 10, right: 10, bottom: bottomPad },
      },
      plugins: {
        legend: {
          display: !!showLegend,
          position: "top",
          labels: {
            font: { family: "Arial, sans-serif", size: 12 },
            boxWidth: 14,
            boxHeight: 14,
          },
        },
        title: { display: false },
        datalabels: { display: false },
        tooltip: {
          callbacks: {
            footer(items) {
              const total = items.reduce(
                (sum, item) => sum + Number(item.parsed.y ?? 0),
                0,
              );
              return `Total: ${total}`;
            },
          },
        },
      },
      scales: {
        x: {
          stacked: datasets.length > 1,
          grid: { display: false },
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 7,
            font: { family: "Arial, sans-serif", size: 12 },
          },
        },
        y: {
          stacked: datasets.length > 1,
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

  function buildDatasets({
    safeLabels,
    safeLocationVolumeData,
    safeLegacyVolume,
    locationsById,
  }) {
    console.log(
      "[dailyVolumeWithObservations] safeLabels count:",
      safeLabels.length,
    );
    console.log(
      "[dailyVolumeWithObservations] safeLocationVolumeData count:",
      safeLocationVolumeData.length,
    );
    console.log(
      "[dailyVolumeWithObservations] safeLegacyVolume count:",
      safeLegacyVolume.length,
    );

    if (safeLocationVolumeData.length > 0) {
      console.log(
        "[dailyVolumeWithObservations] using stacked location datasets:",
        safeLocationVolumeData.map((s) => ({
          locationId: s?.locationId,
          label: s?.label,
          total: (s?.data ?? []).reduce((sum, n) => sum + Number(n ?? 0), 0),
        })),
      );

      const sortedLocationVolumeData = [...safeLocationVolumeData].sort(
        (a, b) => {
          const totalA = (a?.data ?? []).reduce(
            (sum, n) => sum + Number(n ?? 0),
            0,
          );
          const totalB = (b?.data ?? []).reduce(
            (sum, n) => sum + Number(n ?? 0),
            0,
          );
          return totalB - totalA;
        },
      );

      return sortedLocationVolumeData.map((series, index) => {
        const location = series?.locationId
          ? locationsById?.[series.locationId]
          : null;

        const backgroundColor =
          location?.background_color ||
          series?.backgroundColor ||
          defaultColor(index);

        console.log("[dailyVolumeWithObservations] dataset color:", {
          locationId: series?.locationId,
          label: series?.label,
          matchedLocation: !!location,
          backgroundColor,
        });

        return {
          label: series?.label ?? location?.name ?? `Ubicación ${index + 1}`,
          data: Array.isArray(series?.data)
            ? series.data.map((n) => Number(n ?? 0))
            : safeLabels.map(() => 0),
          backgroundColor,
          borderColor: backgroundColor,
          borderWidth: 0,
          borderRadius: index === sortedLocationVolumeData.length - 1 ? 6 : 0,
          borderSkipped: false,
          stack: "patients",
        };
      });
    }

    console.log(
      "[dailyVolumeWithObservations] FALLING BACK to legacy single-series volumeData",
    );

    return [
      {
        label: "Pacientes",
        data: safeLegacyVolume.map((n) => Number(n ?? 0)),
        backgroundColor: "#009688",
        borderColor: "#009688",
        borderWidth: 0,
        borderRadius: 6,
        borderSkipped: false,
      },
    ];
  }

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

  function defaultColor(index) {
    const palette = [
      "#009688",
      "#42A5F5",
      "#FFB300",
      "#7E57C2",
      "#EF5350",
      "#66BB6A",
      "#8D6E63",
      "#26C6DA",
    ];
    return palette[index % palette.length];
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

        let laneTop = chartArea.bottom + lanePadTop;
        const maxBottom = chart.height - lanePadBottom;

        let laneBottom = Math.min(laneTop + laneHeight, maxBottom);

        if (laneBottom - laneTop < laneHeight) {
          laneTop = Math.max(chartArea.bottom + 6, maxBottom - laneHeight);
          laneBottom = Math.min(laneTop + laneHeight, maxBottom);
        }

        const laneMid = Math.round((laneTop + laneBottom) / 2) + 2;

        const maxStack = 3;
        const markerR = 6;
        const stackGap = 14;

        ctx.save();

        if (showLaneTitle && laneTitle) {
          ctx.font = "bold 12px Arial, sans-serif";
          ctx.fillStyle = "rgba(0,0,0,0.75)";
          ctx.textBaseline = "top";
          ctx.fillText(laneTitle, chartArea.left + 4, laneTop + 2);
        }

        for (let i = 0; i < lanePoints.length; i++) {
          const { events } = lanePoints[i];
          if (!events || events.length === 0) continue;

          const x = xScale.getPixelForValue(i);

          const normalized = events.map((e) => ({
            ...e,
            impact: e?.type?.impact ?? "negative",
          }));

          const visible = normalized.slice(0, maxStack);
          const hiddenCount = Math.max(0, normalized.length - visible.length);

          for (let s = 0; s < visible.length; s++) {
            const ev = visible[s];
            const y = laneMid - s * stackGap;

            const fill =
              ev.impact === "positive"
                ? "rgba(46, 125, 50, 0.95)"
                : "rgba(198, 40, 40, 0.95)";

            drawDot(ctx, x, y, markerR, fill);
          }

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

        if (showLegend) {
          ctx.font = "12px Arial, sans-serif";
          ctx.fillStyle = "rgba(0,0,0,0.70)";
          ctx.textBaseline = "top";
          ctx.fillText(
            "Observaciones: 🟢 Favorable   🔴 Desfavorable   +N más",
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
}

export function buildLocationVolumeData({
  patients = [],
  labels = [],
  timeZone = "America/Guatemala",
}) {
  const labelIndexByYmd = Object.fromEntries(
    labels.map((ymd, index) => [ymd, index]),
  );

  const seriesByLocationId = {};

  for (const patient of patients) {
    const locationId = String(patient?.location_id ?? "").trim();
    if (!locationId) continue;

    const locationName =
      String(patient?.location_name ?? "").trim() || locationId;

    const startDate = timestampToDate(patient?.start_time);
    if (!startDate) continue;

    const ymd = formatDateToYmdInTimeZone(startDate, timeZone);
    const dayIndex = labelIndexByYmd[ymd];
    if (dayIndex === undefined) continue;

    if (!seriesByLocationId[locationId]) {
      seriesByLocationId[locationId] = {
        locationId,
        label: locationName,
        data: labels.map(() => 0),
      };
    }

    seriesByLocationId[locationId].data[dayIndex] += 1;
  }

  return Object.values(seriesByLocationId);
}

export function buildLocationsById(locations = []) {
  return Object.fromEntries(
    (Array.isArray(locations) ? locations : [])
      .filter((location) => String(location?.id ?? "").trim())
      .map((location) => [String(location.id).trim(), location]),
  );
}

function timestampToDate(value) {
  if (!value) return null;

  if (typeof value?.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "number") {
    return new Date(value);
  }

  return null;
}

function formatDateToYmdInTimeZone(date, timeZone = "America/Guatemala") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  return `${year}-${month}-${day}`;
}
