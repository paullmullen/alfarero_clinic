/* ============================================================
   OPERATIONAL INSIGHTS ENGINE (Cloud Functions Safe)
   ============================================================
   TIME UNIT CONTRACT:
   - patient.plan_of_care.waiting_time  -> seconds (raw)
   - analytics / insights               -> minutes
   - thresholds                         -> seconds (converted here)
   ============================================================ */

/* ============================================================
   HELPERS
   ============================================================ */

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function severityBadge(severity) {
  return severity === "high" ? "🔴" : severity === "medium" ? "🟠" : "🟡";
}

/**
 * Normalize clinicDate to "YYYY-MM-DD"
 * Accepts:
 *  - "YYYY-MM-DD"
 *  - ISO strings
 *  - Date
 *  - Firestore Timestamp (has toDate())
 */
function normalizeClinicDateToYMD(clinicDate) {
  if (typeof clinicDate === "string") {
    const ymd = clinicDate.slice(0, 10);
    const [y, m, d] = ymd.split("-").map(Number);
    if (y && m && d) return ymd;
    throw new Error(`normalizeClinicDateToYMD: invalid string "${clinicDate}"`);
  }

  if (clinicDate && typeof clinicDate.toDate === "function") {
    const d = clinicDate.toDate();
    if (Number.isNaN(d.getTime())) {
      throw new Error("normalizeClinicDateToYMD: Timestamp.toDate() invalid");
    }
    return d.toISOString().slice(0, 10);
  }

  if (clinicDate instanceof Date) {
    if (Number.isNaN(clinicDate.getTime())) {
      throw new Error("normalizeClinicDateToYMD: Date is invalid");
    }
    return clinicDate.toISOString().slice(0, 10);
  }

  throw new Error(
    `normalizeClinicDateToYMD: unsupported type (${typeof clinicDate})`,
  );
}

/* ============================================================
   WAIT TIME ANOMALIES
   ============================================================ */

function detectWaitTimeAnomalies(
  todaySnapshot,
  historicalSnapshot,
  thresholds,
) {
  const todayByStation = {};
  const historyByStation = {};

  // TODAY (patients collection)
  todaySnapshot.forEach((doc) => {
    const plan = doc.data().plan_of_care ?? [];
    for (const step of plan) {
      if (step.status === "complete" && typeof step.waiting_time === "number") {
        const station = step.station;
        const minutes = step.waiting_time / 60; // seconds → minutes
        todayByStation[station] ??= [];
        todayByStation[station].push(minutes);
      }
    }
  });

  // HISTORICAL (patients collection)
  historicalSnapshot.forEach((doc) => {
    const plan = doc.data().plan_of_care ?? [];
    for (const step of plan) {
      if (step.status === "complete" && typeof step.waiting_time === "number") {
        const station = step.station;
        const minutes = step.waiting_time / 60; // seconds → minutes
        historyByStation[station] ??= [];
        historyByStation[station].push(minutes);
      }
    }
  });

  const insights = [];

  for (const station of Object.keys(todayByStation)) {
    if (!historyByStation[station]?.length) continue;

    const todayAvg =
      todayByStation[station].reduce((a, b) => a + b, 0) /
      todayByStation[station].length;

    const baseline = median(historyByStation[station]);

    // thresholds stored in seconds → minutes
    const thresholdMin = (thresholds?.[station] ?? 900) / 60;

    if (todayAvg > baseline * 1.5 && todayAvg > thresholdMin) {
      insights.push({
        type: "wait_anomaly",
        severity: todayAvg > baseline * 2 ? "high" : "medium",
        title: `Tiempo de espera elevado en ${station.toUpperCase()}`,
        explanation: `Promedio hoy: ${todayAvg.toFixed(
          1,
        )} min vs histórico ${baseline.toFixed(1)} min.`,
        metrics: { station, todayAvg, baseline },
      });
    }
  }

  return insights;
}

/* ============================================================
   ARRIVAL SURGES
   ============================================================ */

/**
 * Computes historical hourly average arrivals.
 * Safe defaults + guards:
 * - timezoneOffsetMinutes defaults to 0 if missing
 * - ignores docs with missing/invalid start_time
 */
function computeHistoricalHourlyAverages(
  last30DaysSnapshot,
  timezoneOffsetMinutes,
) {
  const tz =
    typeof timezoneOffsetMinutes === "number" &&
    Number.isFinite(timezoneOffsetMinutes)
      ? timezoneOffsetMinutes
      : 0;

  if (tz === 0 && timezoneOffsetMinutes !== 0) {
    // Helps catch the exact issue you're seeing without crashing
    console.warn(
      "computeHistoricalHourlyAverages: timezoneOffsetMinutes missing/invalid; defaulting to 0. Received:",
      timezoneOffsetMinutes,
    );
  }

  const hourTotals = {};
  const hourDays = {};

  last30DaysSnapshot.forEach((doc) => {
    const data = doc.data();

    // Guard: start_time must be a Firestore Timestamp-like
    if (!data.start_time || typeof data.start_time.toDate !== "function")
      return;

    const startDate = data.start_time.toDate();
    if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime()))
      return;

    const local = new Date(startDate.getTime() - tz * 60 * 1000);
    if (Number.isNaN(local.getTime())) return;

    const hour = local.getHours();

    // Avoid toISOString on invalid dates (already guarded, but keep safe)
    const iso = local.toISOString(); // safe now
    const dayKey = iso.split("T")[0];

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
        type: "arrival_surge",
        severity: today > baseline * 1.8 ? "high" : "medium",
        title: `Afluencia inusual a las ${hour}:00`,
        explanation: `Llegaron ${today} pacientes vs promedio histórico de ${baseline.toFixed(
          1,
        )}.`,
        metrics: { hour: Number(hour), today, baseline },
      });
    }
  }

  return insights;
}

/* ============================================================
   FLOW BOTTLENECKS
   ============================================================ */

function detectFlowBottlenecks(todaySnapshot) {
  const paths = [];

  todaySnapshot.forEach((doc) => {
    const data = doc.data();
    if (!data.start_time || !data.stop_time) return;
    if (typeof data.start_time.toDate !== "function") return;
    if (typeof data.stop_time.toDate !== "function") return;

    const start = data.start_time.toDate();
    const stop = data.stop_time.toDate();
    if (Number.isNaN(start.getTime()) || Number.isNaN(stop.getTime())) return;

    const visited = (data.plan_of_care ?? [])
      .filter(
        (s) => s.status === "complete" && s.station && s.station !== "reg",
      )
      .sort((a, b) => a.order - b.order)
      .map((s) => s.station);

    if (visited.length < 2) return;

    const durationMin = (stop - start) / 60000;
    paths.push({ path: visited.join(" → "), durationMin });
  });

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
        type: "flow_bottleneck",
        severity: avg > overallAvg * 1.5 ? "high" : "medium",
        title: "Recorrido con duración elevada",
        explanation: `Ruta ${path}: ${avg.toFixed(
          1,
        )} min vs promedio general ${overallAvg.toFixed(1)} min.`,
        metrics: { path, avg, overallAvg },
      });
    }
  }

  return insights;
}
/* ============================================================
   NEW PATIENT RATIO INSIGHTS
   ============================================================ */

function detectNewPatientTrends(todaySnapshot, historicalSnapshot) {
  const insights = [];

  let todayTotal = 0;
  let todayNew = 0;

  todaySnapshot.forEach((doc) => {
    const data = doc.data() ?? {};
    todayTotal++;
    if (data.new_patient === true) todayNew++;
  });

  if (todayTotal === 0) return [];

  const todayRatio = todayNew / todayTotal;

  // HISTORICAL BASELINE (last 30 days)
  let histTotal = 0;
  let histNew = 0;

  historicalSnapshot.forEach((doc) => {
    const data = doc.data() ?? {};
    histTotal++;
    if (data.new_patient === true) histNew++;
  });

  if (histTotal < 20) return []; // not enough history for meaningful baseline

  const baselineRatio = histNew / histTotal;

  // ---- HIGH NEW PATIENT SURGE ----
  if (todayRatio > baselineRatio * 1.5 && todayNew >= 5) {
    insights.push({
      type: "new_patient_surge",
      severity: todayRatio > baselineRatio * 2 ? "high" : "medium",
      title: "Alta proporción de pacientes nuevos",
      explanation: `Hoy ${todayNew} de ${todayTotal} pacientes (${(
        todayRatio * 100
      ).toFixed(1)}%) son nuevos vs promedio histórico ${(
        baselineRatio * 100
      ).toFixed(1)}%.`,
      metrics: {
        todayNew,
        todayTotal,
        todayRatio,
        baselineRatio,
      },
    });
  }

  // ---- UNUSUALLY LOW NEW PATIENT RATE ----
  if (todayRatio < baselineRatio * 0.5 && todayTotal >= 10) {
    insights.push({
      type: "low_new_patient_rate",
      severity: "medium",
      title: "Baja llegada de pacientes nuevos",
      explanation: `Solo ${(todayRatio * 100).toFixed(
        1,
      )}% de pacientes son nuevos vs promedio histórico ${(
        baselineRatio * 100
      ).toFixed(1)}%.`,
      metrics: {
        todayNew,
        todayTotal,
        todayRatio,
        baselineRatio,
      },
    });
  }

  return insights;
}

/* ============================================================
   HTML RENDERING
   ============================================================ */

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
        </li>`,
        )
        .join("")}
    </ul>
  `;
}

/* ============================================================
   PERSISTENCE (OPTION A, IDEMPOTENT)
   ============================================================ */

async function persistInsights({ db, Timestamp }, insights, clinicDate) {
  if (!insights.length) {
    console.log("No operational insights detected for", clinicDate);
    return;
  }

  const clinicYMD = normalizeClinicDateToYMD(clinicDate);

  const [y, m, d] = clinicYMD.split("-").map(Number);
  const dayStartUtc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  if (Number.isNaN(dayStartUtc.getTime())) {
    throw new Error(
      `persistInsights: failed to build Date from clinicYMD="${clinicYMD}"`,
    );
  }

  const collection = db.collection("operational_insights");

  for (const insight of insights) {
    const stationKey = insight.metrics?.station?.toUpperCase() ?? "GLOBAL";
    const docId = `${clinicYMD}__${insight.type.toUpperCase()}__${stationKey}`;
    const ref = collection.doc(docId);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);

      const basePayload = {
        date: Timestamp.fromDate(dayStartUtc),
        clinic_date: clinicYMD,
        type: insight.type,
        station: insight.metrics?.station ?? null,
        severity: insight.severity,
        metrics: insight.metrics ?? {},
        title: insight.title,
        explanation: insight.explanation,
        detected_at: Timestamp.now(),
        version: 1,
      };

      if (!snap.exists) {
        tx.set(ref, {
          ...basePayload,
          resolved_at: null,
          resolution: { acknowledged: false, notes: null, by: null },
        });
      } else {
        // Update analytics only; preserve resolution fields
        tx.update(ref, basePayload);
      }
    });
  }
}

/* ============================================================
   EXPORTS
   ============================================================ */

module.exports = {
  detectWaitTimeAnomalies,
  computeHistoricalHourlyAverages,
  detectArrivalSurges,
  detectFlowBottlenecks,
  detectNewPatientTrends,
  renderInsightsHTML,
  persistInsights,
};
