// Counts describe saved reports/flags, never incident rates or inferred closures.
export const escapeHTML = (value) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#39;");

export function shiftDay(day, offset) {
  const date = new Date(`${day}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day) {
    throw new Error("Invalid clinic date");
  }
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

const groups = {
  planned_closure: "availability", staff_absence: "availability",
  equipment_failure: "equipment", staff_meeting: "events",
  servicioExtendido: "extra", extended_service: "extra", external_doc: "extra", promotion: "extra", jornada: "extra",
};
const themes = {
  availability: ["Disponibilidad y personal", "Revisar cobertura y cambios de horario por servicio."],
  equipment: ["Equipo e infraestructura", "Revisar reparación, continuidad y alternativas de atención."],
  events: ["Reuniones y eventos", "Confirmar qué sesiones cambiaron y cómo se avisó a los pacientes."],
  extra: ["Servicios adicionales y actividad regional", "Distinguir atención en clínica, jornadas y registros de otras regiones."],
  other: ["Otras observaciones", "Confirmar el contexto con el equipo."],
};
const services = { doc: "Medicina adultos", den: "Odontología", lab: "Laboratorio", ped: "Pediatría", nut: "Nutrición", reg: "Registro", nur: "Enfermería", pha: "Farmacia", pt: "Fisioterapia", og: "Ginecología", pra: "Oración", psi: "Psicología" };
const flags = { arrival_surge: "Afluencia inusual", wait_anomaly: "Espera registrada inusual", flow_bottleneck: "Recorrido registrado lento", service_suppression: "Menor alcance de servicio", low_new_patient_rate: "Baja proporción de pacientes nuevos", new_patient_surge: "Mayor proporción de pacientes nuevos" };
const location = (r) => String(r.location_id ?? r.location ?? "").trim() || "Sin ubicación registrada";
const dates = (rows, field) => [...new Set(rows.map(r => r[field]))].sort();
const inRange = (day, start, end) => typeof day === "string" && day >= start && day <= end;

export function buildOperationalReview({ observations = [], insights = [], endDay, days = 7 }) {
  if (![1, 7].includes(days)) throw new Error("Review period must be one or seven days");
  const startDay = shiftDay(endDay, 1 - days), historyStart = shiftDay(endDay, -27);
  const history = observations.filter(o => inRange(o.ymd, historyStart, endDay));
  const current = history.filter(o => inRange(o.ymd, startDay, endDay));
  const currentFlags = insights.filter(i => i.type !== "ops_observation" && inRange(i.clinic_date, startDay, endDay));
  const grouped = new Map();
  for (const row of history) {
    const theme = groups[row.typeId] ?? "other";
    // Location remains part of the grouping; unassigned records are never assumed Zone 3.
    for (const service of new Set(Array.isArray(row.servicesAffected) && row.servicesAffected.length ? row.servicesAffected : ["unspecified"])) {
      const key = JSON.stringify([theme, service, location(row)]);
      const bucket = grouped.get(key) ?? { theme, service, location: location(row), history: [], current: [] };
      bucket.history.push(row);
      if (inRange(row.ymd, startDay, endDay)) bucket.current.push(row);
      grouped.set(key, bucket);
    }
  }
  const patterns = [...grouped.values()].filter(b => b.current.length).map(b => ({
    theme: b.theme, service: b.service, location: b.location,
    entries: b.current.length, dates: dates(b.current, "ymd"),
    historyDates: dates(b.history, "ymd"),
  })).sort((a, b) => b.dates.length - a.dates.length || b.historyDates.length - a.historyDates.length || a.service.localeCompare(b.service));
  const flagTypes = [...new Set(currentFlags.map(i => i.type))].sort().map(type => {
    const rows = currentFlags.filter(i => i.type === type);
    return { type, records: rows.length, dates: dates(rows, "clinic_date") };
  });
  return { startDay, endDay, historyStart, days, entries: current.length, observationDates: dates(current, "ymd"),
    unknownLocationEntries: current.filter(o => location(o) === "Sin ubicación registrada").length,
    patterns, flagTypes, observations: [...current].sort((a, b) => b.ymd.localeCompare(a.ymd)) };
}

export function renderOperationalReview(review) {
  const e = escapeHTML, daily = review.days === 1;
  const rows = review.patterns.slice(0, daily ? 5 : 8).map(p => `<tr><td>${e(themes[p.theme][0])}<br><strong>${e(services[p.service] ?? p.service)}</strong><br>${e(p.location)}</td><td>${p.entries} reporte(s); ${p.dates.length} fecha(s)<br>${e(p.dates.join(", "))}</td><td>${p.historyDates.length} fecha(s) en 28 días</td></tr>`).join("");
  const remaining = Math.max(0, review.patterns.length - (daily ? 5 : 8));
  const flagsHTML = review.flagTypes.length ? `<ul>${review.flagTypes.map(f => `<li>${e(flags[f.type] ?? f.type)}: ${f.records} señal(es) guardada(s), ${f.dates.length} fecha(s).</li>`).join("")}</ul>` : "<p>No hay señales automatizadas guardadas para este período.</p>";
  const notes = review.observations.slice(0, daily ? 3 : 5).map(o => `<li>${e(o.ymd)} — ${e(location(o))}: ${e(String(o.notes ?? "").trim() || "Sin detalles registrados")}</li>`).join("");
  const prompts = [...new Set(review.patterns.map(p => themes[p.theme][1]))];
  return `<section style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#222;padding:16px 0;">
    <h2>${daily ? "Contexto operativo del día" : "Revisión operativa semanal"}</h2>
    <p>${e(review.startDay)}${daily ? "" : ` al ${e(review.endDay)}`} · ${review.entries} reporte(s) del equipo en ${review.observationDates.length} fecha(s).</p>
    ${rows ? `<table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;width:100%;font-size:13px;"><thead><tr><th>Tema y servicio</th><th>Período actual</th><th>Recurrencia</th></tr></thead><tbody>${rows}</tbody></table>` : "<p>No se registraron observaciones del equipo. Esto no confirma que todos los servicios operaron normalmente.</p>"}
    ${remaining ? `<p>Hay ${remaining} agrupación(es) adicionales no mostradas.</p>` : ""}
    ${notes ? `<h3>Detalles reportados</h3><ul>${notes}</ul>${review.observations.length > (daily ? 3 : 5) ? "<p>Se muestran las observaciones más recientes; los conteos incluyen todas las del período.</p>" : ""}` : ""}
    <h3>${daily ? "Señales para revisar" : "Patrones automatizados guardados"}</h3>${flagsHTML}
    ${prompts.length ? `<h3>Para conversar con el equipo</h3><ul>${prompts.slice(0, 3).map(p => `<li>${e(p)}</li>`).join("")}</ul>` : ""}
    ${daily ? "" : "<p>Elegir una mejora concreta, una persona responsable y una fecha de revisión. Este correo no registra acciones ni confirma que se hayan realizado.</p>"}
  </section>`;
}

// Unbounded by a silent report cap: page all matching documents, selecting only report fields.
async function fetchRange(db, collection, dateField, startDay, endDay, fields) {
  const rows = [];
  let cursor;
  do {
    let query = db.collection(collection).where(dateField, ">=", startDay).where(dateField, "<=", endDay)
      .orderBy(dateField).select(...fields).limit(200);
    if (cursor) query = query.startAfter(cursor);
    const snap = await query.get();
    rows.push(...snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    cursor = snap.size === 200 ? snap.docs.at(-1) : null;
  } while (cursor);
  return rows;
}

export async function fetchOperationalReview({ db, endDay, days = 7 }) {
  const [observations, insights] = await Promise.all([
    fetchRange(db, "ops_observations", "ymd", shiftDay(endDay, -27), endDay,
      ["ymd", "typeId", "servicesAffected", "notes", "location_id", "location"]),
    fetchRange(db, "operational_insights", "clinic_date", shiftDay(endDay, 1 - days), endDay,
      ["clinic_date", "type", "station", "location_id", "location"]),
  ]);
  return buildOperationalReview({ observations, insights, endDay, days });
}
