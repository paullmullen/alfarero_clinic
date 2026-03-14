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
    console.warn(
      "computeHistoricalHourlyAverages: timezoneOffsetMinutes missing/invalid; defaulting to 0. Received:",
      timezoneOffsetMinutes,
    );
  }

  const hourTotals = {};
  const hourDays = {};

  last30DaysSnapshot.forEach((doc) => {
    const data = doc.data();

    if (!data.start_time || typeof data.start_time.toDate !== "function")
      return;

    const startDate = data.start_time.toDate();
    if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime()))
      return;

    const local = new Date(startDate.getTime() - tz * 60 * 1000);
    if (Number.isNaN(local.getTime())) return;

    const hour = local.getHours();
    const iso = local.toISOString();
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

  let histTotal = 0;
  let histNew = 0;

  historicalSnapshot.forEach((doc) => {
    const data = doc.data() ?? {};
    histTotal++;
    if (data.new_patient === true) histNew++;
  });

  if (histTotal < 20) return [];

  const baselineRatio = histNew / histTotal;

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
   SERVICE SUPPRESSION (Refined)
   - planned: patient has a step for the station
   - reached: patient actually engaged (waiting/in_process/complete/2..7)
   - not_planned: explicitly skipped
   ============================================================ */

function detectServiceSuppression(
  todaySnapshot,
  historicalSnapshot,
  opts = {},
) {
  const {
    minPlannedToday = 6,
    minPlannedHist = 30,
    reachedDropFactor = 0.6,
    notPlannedSpikeFactor = 1.8,
    minBaselineReachedRate = 0.25,
  } = opts;

  function accumulate(snapshot) {
    const planned = {};
    const reached = {};
    const notPlanned = {};

    snapshot.forEach((doc) => {
      const data = doc.data() ?? {};
      const plan = Array.isArray(data.plan_of_care) ? data.plan_of_care : [];

      const plannedSet = new Set();
      const reachedSet = new Set();
      const notPlannedSet = new Set();

      for (const step of plan) {
        const station = step?.station;
        if (!station || station === "reg") continue;

        plannedSet.add(station);

        const status = step?.status;

        if (status === "not_planned") {
          notPlannedSet.add(station);
          continue;
        }

        if (
          status === "waiting" ||
          status === "in_process" ||
          status === "complete" ||
          status === "two" ||
          status === "three" ||
          status === "four" ||
          status === "five" ||
          status === "six" ||
          status === "seven"
        ) {
          reachedSet.add(station);
        }
      }

      for (const s of plannedSet) planned[s] = (planned[s] ?? 0) + 1;
      for (const s of reachedSet) reached[s] = (reached[s] ?? 0) + 1;
      for (const s of notPlannedSet) notPlanned[s] = (notPlanned[s] ?? 0) + 1;
    });

    return { planned, reached, notPlanned };
  }

  const today = accumulate(todaySnapshot);
  const hist = accumulate(historicalSnapshot);

  const stations = new Set([
    ...Object.keys(today.planned),
    ...Object.keys(hist.planned),
  ]);

  const insights = [];

  for (const station of stations) {
    const plannedToday = today.planned[station] ?? 0;
    if (plannedToday < minPlannedToday) continue;

    const reachedToday = today.reached[station] ?? 0;
    const notPlannedToday = today.notPlanned[station] ?? 0;

    const plannedHist = hist.planned[station] ?? 0;
    if (plannedHist < minPlannedHist) continue;

    const reachedHist = hist.reached[station] ?? 0;
    const notPlannedHist = hist.notPlanned[station] ?? 0;

    const todayReachedRate = plannedToday ? reachedToday / plannedToday : 0;
    const histReachedRate = plannedHist ? reachedHist / plannedHist : 0;

    const todayNotPlannedRate = plannedToday
      ? notPlannedToday / plannedToday
      : 0;

    const histNotPlannedRate = plannedHist ? notPlannedHist / plannedHist : 0;

    if (histReachedRate < minBaselineReachedRate) continue;

    const reachedDropped =
      todayReachedRate < histReachedRate * reachedDropFactor;

    const notPlannedSpiked =
      histNotPlannedRate > 0
        ? todayNotPlannedRate > histNotPlannedRate * notPlannedSpikeFactor
        : todayNotPlannedRate >= 0.35;

    if (!reachedDropped && !notPlannedSpiked) continue;

    const severity =
      todayReachedRate < histReachedRate * 0.35 || todayNotPlannedRate >= 0.6
        ? "high"
        : "medium";

    const parts = [];
    parts.push(
      `Alcance hoy: ${Math.round(todayReachedRate * 100)}% (${reachedToday}/${plannedToday}) vs histórico ${Math.round(
        histReachedRate * 100,
      )}% (${reachedHist}/${plannedHist}).`,
    );

    if (notPlannedSpiked || todayNotPlannedRate > 0.15) {
      parts.push(
        `Marcado como "no planificado" hoy: ${Math.round(
          todayNotPlannedRate * 100,
        )}% (${notPlannedToday}/${plannedToday}) vs histórico ${Math.round(
          histNotPlannedRate * 100,
        )}% (${notPlannedHist}/${plannedHist}).`,
      );
    }

    insights.push({
      type: "service_suppression",
      severity,
      title: `Posible indisponibilidad de ${station.toUpperCase()}`,
      explanation: `${parts.join(
        " ",
      )} Posible servicio no disponible o desviado.`,
      metrics: {
        station,
        plannedToday,
        reachedToday,
        notPlannedToday,
        plannedHist,
        reachedHist,
        notPlannedHist,
        todayReachedRate,
        histReachedRate,
        todayNotPlannedRate,
        histNotPlannedRate,
      },
    });
  }

  return insights;
}

/* ============================================================
   OPS OBSERVATIONS CONTEXT LAYER
   - Attaches matching ops_observations to insights by station
   - Optionally builds "ops_observation" informational insights (email-only)
   ============================================================ */

function buildObservationInsights(observations, typesById = {}) {
  if (!Array.isArray(observations) || observations.length === 0) return [];

  return observations.map((o) => {
    const type = (o?.typeId && typesById?.[o.typeId]) || {};
    const impact = type?.impact || o?.category || "internal";

    const severity =
      impact === "negative" || impact === "external" ? "medium" : "low";

    const title =
      o?.typeId === "staff_absence"
        ? "Ausencia de personal"
        : o?.typeId === "promotion"
          ? "Promoción activa"
          : "Observación operativa";

    const servicesAffected = Array.isArray(o?.servicesAffected)
      ? o.servicesAffected
      : [];

    return {
      type: "ops_observation",
      severity,
      title,
      explanation: o?.notes || "(sin notas)",
      metrics: {
        observationId: o?.id ?? null,
        ymd: o?.ymd ?? null,
        category: o?.category ?? null,
        typeId: o?.typeId ?? null,
        servicesAffected,
      },
    };
  });
}

function attachObservationsToInsights(insights, observations) {
  if (!Array.isArray(insights) || insights.length === 0) return insights ?? [];
  if (!Array.isArray(observations) || observations.length === 0)
    return insights;

  // index observations by affected service (lowercase)
  const byService = {};
  for (const o of observations) {
    const svcs = Array.isArray(o?.servicesAffected) ? o.servicesAffected : [];
    for (const s of svcs) {
      const key = String(s).toLowerCase();
      byService[key] ??= [];
      byService[key].push(o);
    }
  }

  // stable newest-first within each service
  for (const k of Object.keys(byService)) {
    byService[k].sort((a, b) => {
      const at = a?.date?.toMillis ? a.date.toMillis() : 0;
      const bt = b?.date?.toMillis ? b.date.toMillis() : 0;
      return bt - at;
    });
  }

  return insights.map((i) => {
    const station = i?.metrics?.station
      ? String(i.metrics.station).toLowerCase()
      : null;

    if (!station) return i;

    const matches = byService[station] ?? [];
    if (matches.length === 0) return i;

    const lines = matches.slice(0, 3).map((o) => {
      const note = o?.notes || o?.typeId || "observación";
      const ymd = o?.ymd ? `${o.ymd}: ` : "";
      return `• ${ymd}${note}`;
    });

    const context = `\n\nContexto operativo:\n${lines.join("\n")}`;

    return {
      ...i,
      explanation: `${i.explanation ?? ""}${context}`,
      metrics: {
        ...(i.metrics ?? {}),
        opsObservationIds: matches.map((o) => o?.id).filter(Boolean),
      },
    };
  });
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
        tx.update(ref, basePayload);
      }
    });
  }
}

/* ============================================================
   EXPORTS
   ============================================================ */

export {
  detectWaitTimeAnomalies,
  computeHistoricalHourlyAverages,
  detectArrivalSurges,
  detectFlowBottlenecks,
  detectNewPatientTrends,
  detectServiceSuppression,

  // Context layer exports
  attachObservationsToInsights,
  buildObservationInsights,
  renderInsightsHTML,
  persistInsights,
};
