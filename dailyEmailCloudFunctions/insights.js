/* ============================================================
   AI-DRIVEN OPERATIONAL INSIGHTS (DETERMINISTIC CORE)
   ============================================================ */

const TIMEZONE_OFFSET_MINUTES = 6 * 60;

/* ---------- Helpers ---------- */

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function severityBadge(severity) {
  switch (severity) {
    case "high":
      return "🔴";
    case "medium":
      return "🟠";
    default:
      return "🟡";
  }
}

/* ---------- WAIT TIME ANOMALIES ---------- */

function detectWaitTimeAnomalies(
  todaySnapshot,
  historicalSnapshot,
  thresholds
) {
  const todayByStation = {};
  const historyByStation = {};

  const collect = (snapshot, target) => {
    snapshot.forEach((doc) => {
      for (const step of doc.data().plan_of_care ?? []) {
        if (
          step.status === "complete" &&
          typeof step.waiting_time === "number"
        ) {
          const station = step.station;
          target[station] ??= [];
          target[station].push(step.waiting_time / 60); // minutes
        }
      }
    });
  };

  collect(todaySnapshot, todayByStation);
  collect(historicalSnapshot, historyByStation);

  const insights = [];

  for (const station of Object.keys(todayByStation)) {
    if (!historyByStation[station]) continue;

    const todayAvg =
      todayByStation[station].reduce((a, b) => a + b, 0) /
      todayByStation[station].length;

    const baseline = median(historyByStation[station]);
    const thresholdMin = (thresholds?.[station] ?? 900) / 60;

    if (todayAvg > baseline * 1.5 && todayAvg > thresholdMin) {
      insights.push({
        type: "anomaly",
        severity: todayAvg > baseline * 2 ? "high" : "medium",
        title: `Tiempo de espera elevado en ${station.toUpperCase()}`,
        explanation: `Promedio hoy: ${todayAvg.toFixed(
          1
        )} min vs histórico ${baseline.toFixed(1)} min.`,
        metrics: { station, todayAvg, baseline },
      });
    }
  }

  return insights;
}

/* ---------- ARRIVAL SURGES ---------- */

function computeHistoricalHourlyAverages(last30DaysSnapshot) {
  const hourTotals = {};
  const hourDays = {};

  last30DaysSnapshot.forEach((doc) => {
    const data = doc.data();
    if (!data.start_time) return;

    const local = new Date(
      data.start_time.toDate().getTime() - TIMEZONE_OFFSET_MINUTES * 60 * 1000
    );

    const hour = local.getHours();
    const dayKey = local.toISOString().split("T")[0];

    hourTotals[hour] = (hourTotals[hour] ?? 0) + 1;
    hourDays[hour] ??= new Set();
    hourDays[hour].add(dayKey);
  });

  const avg = {};
  for (const h of Object.keys(hourTotals)) {
    avg[h] = hourTotals[h] / Math.max(1, hourDays[h].size);
  }

  return avg;
}

function detectArrivalSurges(hourlyCounts, historicalHourlyAvg) {
  const insights = [];

  for (const hour of Object.keys(hourlyCounts)) {
    const today = hourlyCounts[hour];
    const baseline = historicalHourlyAvg[hour];

    if (!baseline || baseline < 1) continue;

    if (today > baseline * 1.4) {
      insights.push({
        type: "anomaly",
        severity: today > baseline * 1.8 ? "high" : "medium",
        title: `Afluencia inusual a las ${hour}:00`,
        explanation: `Llegaron ${today} pacientes vs promedio histórico de ${baseline.toFixed(
          1
        )}.`,
        metrics: { hour, today, baseline },
      });
    }
  }

  return insights;
}

/* ---------- FLOW BOTTLENECKS ---------- */

function extractVisitPaths(snapshot) {
  const paths = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (!data.start_time || !data.stop_time) return;

    const visited = (data.plan_of_care ?? [])
      .filter(
        (s) => s.status === "complete" && s.station && s.station !== "reg"
      )
      .sort((a, b) => a.order - b.order)
      .map((s) => s.station);

    if (visited.length < 2) return;

    const durationMin =
      (data.stop_time.toDate() - data.start_time.toDate()) / 60000;

    paths.push({
      path: visited.join(" → "),
      durationMin,
    });
  });

  return paths;
}

function detectFlowBottlenecks(todaySnapshot) {
  const paths = extractVisitPaths(todaySnapshot);
  if (paths.length < 5) return [];

  const overallAvg =
    paths.reduce((a, b) => a + b.durationMin, 0) / paths.length;

  const byPath = {};
  for (const p of paths) {
    byPath[p.path] ??= [];
    byPath[p.path].push(p.durationMin);
  }

  const insights = [];

  for (const [path, durations] of Object.entries(byPath)) {
    if (durations.length < 3) continue;

    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;

    if (avg > overallAvg * 1.25) {
      insights.push({
        type: "opportunity",
        severity: avg > overallAvg * 1.5 ? "high" : "medium",
        title: "Recorrido con duración elevada",
        explanation: `Ruta ${path}: ${avg.toFixed(
          1
        )} min vs promedio general ${overallAvg.toFixed(1)} min.`,
        metrics: { path, avg, overallAvg },
      });
    }
  }

  return insights;
}

/* ---------- HTML RENDER ---------- */

function renderInsightsHTML(insights) {
  if (!insights.length) {
    return `
      <h3>🧠 Insights Operativos</h3>
      <p><em>No se detectaron anomalías relevantes hoy.</em></p>
    `;
  }

  return `
    <h3>🧠 Insights Operativos</h3>
    <ul>
      ${insights
        .map(
          (i) => `
        <li>
          ${severityBadge(i.severity)}
          <strong>${i.title}</strong><br/>
          ${i.explanation}
        </li>
      `
        )
        .join("")}
    </ul>
  `;
}

/* ---------- EXPORT ---------- */

module.exports = {
  detectWaitTimeAnomalies,
  computeHistoricalHourlyAverages,
  detectArrivalSurges,
  detectFlowBottlenecks,
  renderInsightsHTML,
};
