// dailyEmail/template.js
"use strict";

/**
 * Returns the daily email HTML.
 * Intentionally preserves your existing structure/content.
 */
function buildDailyEmailHTML({
  patientInsights,
  charts,
  insightsHTML,
  totals,
  milestone,
}) {
  const {
    patientSummaryChart,
    newVsRepeatChart,
    visitTypeChart,
    arrivalChart,
    waitingChart,
    waitingHeatmap,
  } = charts;

  const { totalPatients } = totals;
  const { nextMilestone, projectedDateStr } = milestone;

  return `
<div style="text-align: center; margin-bottom: 20px;">
  <img src="https://firebasestorage.googleapis.com/v0/b/alfarero-478ad.appspot.com/o/full_logo.png?alt=media&token=11098abc-ae65-440e-8bfd-b345f65be332" />
</div>
<p>Estimado Compañero,</p>
<p>A continuación se presenta un resumen de los servicios brindados hoy y el promedio diario de los últimos 30 días:</p>
<table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
  <thead>
    <tr>
      <th style="width: 120px;"></th>
      <th style="width: 120px;">Total</th>
      <th style="width: 120px;">Pediatría</th>
      <th style="width: 120px;">Clínica General</th>
      <th style="width: 120px;">Fisioterapia</th>
      <th style="width: 120px;">Odontología</th>
      <th style="width: 120px;">Laboratorio</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Pacientes Hoy</strong></td>
      <td>${patientInsights.todayCounts.total.toLocaleString("en-US")}</td>
      <td>${patientInsights.todayCounts.pediatria.toLocaleString("en-US")}</td>
      <td>${patientInsights.todayCounts.clinica_general.toLocaleString("en-US")}</td>
      <td>${patientInsights.todayCounts.fisioterapia.toLocaleString("en-US")}</td>
      <td>${patientInsights.todayCounts.odontologia.toLocaleString("en-US")}</td>
      <td>${patientInsights.todayCounts.laboratorio.toLocaleString("en-US")}</td>
    </tr>
    <tr>
      <td><strong>Promedio Diario (últimos 30 días)</strong></td>
      <td>${patientInsights.avgCounts.total.toFixed(1).toLocaleString("en-US")}</td>
      <td>${patientInsights.avgCounts.pediatria.toFixed(1).toLocaleString("en-US")}</td>
      <td>${patientInsights.avgCounts.clinica_general.toFixed(1).toLocaleString("en-US")}</td>
      <td>${patientInsights.avgCounts.fisioterapia.toFixed(1).toLocaleString("en-US")}</td>
      <td>${patientInsights.avgCounts.odontologia.toFixed(1).toLocaleString("en-US")}</td>
      <td>${patientInsights.avgCounts.laboratorio.toFixed(1).toLocaleString("en-US")}</td>
    </tr>
  </tbody>
</table>
<p>Tenga en cuenta que el total no equivale a la suma de los servicios. Farmacia, nutrición y otros servicios se incluyen en el total, pero no se reportan en columnas separadas.</p>

<br/><br/>
<img src="${patientSummaryChart}" />
<br/><br/>
<img src="${newVsRepeatChart}" />

<br/><br/>
<img src="${visitTypeChart}" />

<br/><br/>
<img src="${arrivalChart}" />
<br/><br/>
<img src="${waitingChart}" />
<br/><br/>
<img src="${waitingHeatmap}" />
<br/><br/>
${insightsHTML}
<br/><br/>
<p>Hasta la fecha se han atendido <strong>${totalPatients.toLocaleString("en-US")}</strong> pacientes.</p>
<p>A este ritmo, habrán atendido a <strong>${nextMilestone.toLocaleString("en-US")}</strong> pacientes para el <strong>${projectedDateStr}</strong>.</p>
<p>¡Cristo Vive!<br/><br/>Josué Rivas,<br/>Gerente</p>
`;
}

module.exports = { buildDailyEmailHTML };
