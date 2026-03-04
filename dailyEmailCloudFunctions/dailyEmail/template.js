/* eslint-env node */
"use strict";
const SECTION_GAP = 48;
/**
 * Daily email HTML (Outlook-friendly).
 *
 * Improvements:
 * - Fixed-width container table (800px)
 * - All charts rendered using a consistent section wrapper
 * - Uses padding instead of margins to avoid margin-collapse
 * - Chart images forced to display:block and centered
 * - Single place to control chart spacing
 */

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Standard chart section
 */
function chartSection({ src, alt, title }) {
  if (!src) return "";

  const titleHTML = title
    ? `
      <tr>
        <td style="
          font-family: Arial, sans-serif;
          font-size: 18px;
          font-weight: 700;
          padding: 0 0 10px 0;
        ">
          ${escapeHtml(title)}
        </td>
      </tr>
    `
    : "";

  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
         style="margin:0 0 ${SECTION_GAP}px 0;">
    <tr>
      <td align="center">

        <table role="presentation" width="800" cellspacing="0" cellpadding="0" border="0"
               style="width:800px; max-width:800px;">

          ${titleHTML}

          <tr>
            <td align="center">
              <img
                src="${src}"
                alt="${escapeHtml(alt)}"
                width="800"
                style="
                  display:block;
                  width:100%;
                  max-width:800px;
                  height:auto;
                  border:0;
                  outline:none;
                  text-decoration:none;
                "
              />
            </td>
          </tr>
          <!-- Spacer row: reliable in Outlook/Gmail -->
          <tr>
            <td height="${SECTION_GAP}" style="height:${SECTION_GAP}px; line-height:${SECTION_GAP}px; font-size:${SECTION_GAP}px;">
              &nbsp;
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
  `;
}

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
    stationPlanVsCompletedChart,
  } = charts;

  const { totalPatients } = totals;
  const { nextMilestone, projectedDateStr } = milestone;

  return `
<!doctype html>
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Informe Diario</title>
</head>

<body style="margin:0; padding:0; background:#ffffff;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
<tr>
<td align="center" style="padding:16px;">

<table role="presentation" width="800" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; width:800px; max-width:800px;">

<tr>
<td style="font-family:Arial, sans-serif; font-size:14px; line-height:1.45; color:#111111;">

<!-- Logo -->
<div style="text-align:center; padding-bottom:16px;">
<img
src="https://firebasestorage.googleapis.com/v0/b/alfarero-478ad.appspot.com/o/full_logo.png?alt=media&token=11098abc-ae65-440e-8bfd-b345f65be332"
alt="Clínica Alfarero"
width="360"
style="width:360px; max-width:100%; height:auto; display:inline-block; border:0;"
/>
</div>

<p style="margin:0 0 10px 0;">Estimado Compañero,</p>

<p style="margin:0 0 12px 0;">
A continuación se presenta un resumen de los servicios brindados hoy y el promedio diario de los últimos 30 días:
</p>

<!-- Summary table -->

<table role="presentation" cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse; width:100%; font-size:13px;">
<thead>
<tr>
<th style="width:140px; text-align:left;"></th>
<th style="width:110px;">Total</th>
<th style="width:110px;">Pediatría</th>
<th style="width:140px;">Clínica General</th>
<th style="width:120px;">Fisioterapia</th>
<th style="width:120px;">Odontología</th>
<th style="width:120px;">Laboratorio</th>
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
<td>${patientInsights.avgCounts.total.toFixed(1)}</td>
<td>${patientInsights.avgCounts.pediatria.toFixed(1)}</td>
<td>${patientInsights.avgCounts.clinica_general.toFixed(1)}</td>
<td>${patientInsights.avgCounts.fisioterapia.toFixed(1)}</td>
<td>${patientInsights.avgCounts.odontologia.toFixed(1)}</td>
<td>${patientInsights.avgCounts.laboratorio.toFixed(1)}</td>
</tr>
</tbody>
</table>

<p style="margin:10px 0 30px 0;">
Tenga en cuenta que el total no equivale a la suma de los servicios.
Farmacia, nutrición y otros servicios se incluyen en el total,
pero no se reportan en columnas separadas.
</p>

<!-- Charts -->

<div style="padding-bottom:${SECTION_GAP};">

  <div style="margin:0 0 10px 0; font-family:Arial, sans-serif; font-size:18px; font-weight:700;">
    Volumen Diario de Pacientes (últimos 14 días)
  </div>

  <div style="text-align:center;">
    <img
      src="${charts.dailyVolumeChart}"
      alt="Volumen Diario de Pacientes"
      width="800"
      style="display:block; width:100%; max-width:800px; height:auto; margin:0 auto; border:0;"
    />
      ${
        charts.keyObservationsHTML
          ? `<div style="padding-top:0px;">
         ${charts.keyObservationsHTML}
       </div>`
          : ""
      }

  </div>


</div>

${chartSection({
  src: stationPlanVsCompletedChart,
  alt: "Plan de Atención - Ideal vs Real",
  title: "Plan de Atención - Ideal vs Real",
})}

${chartSection({
  src: patientSummaryChart,
  alt: "Resumen de Pacientes por Servicio",
  title: "Resumen de Pacientes por Servicio (Completado)",
})}

${chartSection({
  src: newVsRepeatChart,
  alt: "Pacientes Nuevos vs Repetidos",
  title: "Pacientes Nuevos vs Repetidos",
})}

${chartSection({
  src: visitTypeChart,
  alt: "Visitas por Tipo",
  title: "Visitas por Tipo (Hoy vs Promedio 30 días)",
})}

${chartSection({
  src: arrivalChart,
  alt: "Llegadas por Hora",
  title: "Llegadas por Hora",
})}

${chartSection({
  src: waitingChart,
  alt: "Tiempo de Espera por Estación",
  title: "Tiempo de Espera por Estación",
})}

${chartSection({
  src: waitingHeatmap,
  alt: "Mapa de Calor de Esperas",
  title: "Mapa de Calor de Esperas",
})}

<!-- Insights -->

<div style="padding-bottom:22px;">
${insightsHTML || ""}
</div>

<p style="margin:0 0 6px 0;">
Hasta la fecha se han recibido <strong>${totalPatients.toLocaleString("en-US")}</strong> visitas de pacientes.
</p>

<p style="margin:0 0 14px 0;">
A este ritmo, habrán atendido a
<strong>${nextMilestone.toLocaleString("en-US")}</strong>
pacientes para el
<strong>${escapeHtml(projectedDateStr)}</strong>.
</p>

<p style="margin:0;">
¡Cristo Vive!<br/><br/>
Josué Rivas,<br/>
Gerente
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;
}

module.exports = { buildDailyEmailHTML };
