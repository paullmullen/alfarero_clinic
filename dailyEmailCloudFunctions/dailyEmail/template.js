/* eslint-env node */
"use strict";

/**
 * Daily email HTML (Outlook-friendly).
 * Improvements:
 *  - Fixed-width container table (800px) centered
 *  - Every chart <img> has explicit width attr + inline styles (Outlook-safe)
 *  - Consistent chart block styling (title + spacing)
 */

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function chartBlock({ src, alt, title }) {
  if (!src) return "";

  const titleHTML = title
    ? `<div style="margin: 0 0 16px 0; font-family: Arial, sans-serif; font-size: 16px; font-weight: 700;">
         ${escapeHtml(title)}
       </div>`
    : "";

  return `
    <div style="margin: 0 0 50px 0;">
      ${titleHTML}
      <div style="text-align:center;">
        <img
          src="${src}"
          alt="${escapeHtml(alt)}"
          width="800"
          style="width:100%; max-width:800px; height:auto; display:block; margin:0 auto; border:0; outline:none; text-decoration:none;"
        />
      </div>
    </div>
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

    // NEW
    stationPlanVsCompletedChart,
  } = charts;

  const { totalPatients } = totals;
  const { nextMilestone, projectedDateStr } = milestone;

  return `
<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Informe Diario</title>
  </head>
  <body style="margin:0; padding:0; background:#ffffff;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; background:#ffffff;">
      <tr>
        <td align="center" style="padding: 16px;">
          <table role="presentation" width="800" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; width:800px; max-width:800px;">
            <tr>
              <td style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.45; color:#111111;">

                <!-- Logo -->
                <div style="text-align:center; margin: 0 0 16px 0;">
                  <img
                    src="https://firebasestorage.googleapis.com/v0/b/alfarero-478ad.appspot.com/o/full_logo.png?alt=media&token=11098abc-ae65-440e-8bfd-b345f65be332"
                    alt="Clínica Alfarero"
                    width="360"
                    style="width:360px; max-width:100%; height:auto; display:inline-block; border:0; outline:none; text-decoration:none;"
                  />
                </div>

                <p style="margin: 0 0 10px 0;">Estimado Compañero,</p>
                <p style="margin: 0 0 12px 0;">
                  A continuación se presenta un resumen de los servicios brindados hoy y el promedio diario de los últimos 30 días:
                </p>

                <!-- Summary table -->
                <table role="presentation" cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse; width:100%; font-family: Arial, sans-serif; font-size: 13px;">
                  <thead>
                    <tr>
                      <th style="width: 140px; text-align:left;"></th>
                      <th style="width: 110px;">Total</th>
                      <th style="width: 110px;">Pediatría</th>
                      <th style="width: 140px;">Clínica General</th>
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

                <p style="margin: 10px 0 36px 0;">
                  Tenga en cuenta que el total no equivale a la suma de los servicios. Farmacia, nutrición y otros servicios se incluyen en el total, pero no se reportan en columnas separadas.
                </p>

                <!-- Charts (consistent blocks) -->

                ${chartBlock({
                  src: charts.dailyVolumeChart,
                  alt: "Volumen Diario de Pacientes",
                  title: "Volumen Diario de Pacientes (últimos 14 días)",
                })}

                ${charts.keyObservationsHTML || ""}

                ${chartBlock({
                  src: stationPlanVsCompletedChart,
                  alt: "Plan de Atención - Ideal vs Real",
                  title: "Plan de Atención - Ideal vs Real",
                })}

                ${chartBlock({
                  src: patientSummaryChart,
                  alt: "Resumen de Pacientes por Servicio",
                  title: "Resumen de Pacientes por Servicio (Completado)",
                })}

                ${chartBlock({
                  src: newVsRepeatChart,
                  alt: "Pacientes Nuevos vs Repetidos",
                  title: "Pacientes Nuevos vs Repetidos",
                })}

                ${chartBlock({
                  src: visitTypeChart,
                  alt: "Visitas por Tipo",
                  title: "Visitas por Tipo (Hoy vs Promedio 30 días)",
                })}

                ${chartBlock({
                  src: arrivalChart,
                  alt: "Llegadas por Hora",
                  title: "Llegadas por Hora",
                })}

                ${chartBlock({
                  src: waitingChart,
                  alt: "Tiempo de Espera por Estación",
                  title: "Tiempo de Espera por Estación",
                })}

                ${chartBlock({
                  src: waitingHeatmap,
                  alt: "Mapa de Calor de Esperas",
                  title: "Mapa de Calor de Esperas",
                })}

                <!-- Insights -->
                <div style="margin: 0 0 22px 0;">
                  ${insightsHTML || ""}
                </div>

                <p style="margin: 0 0 6px 0;">
                  Hasta la fecha se han recibido <strong>${totalPatients.toLocaleString("en-US")}</strong> visitas de pacientes.
                </p>
                <p style="margin: 0 0 14px 0;">
                  A este ritmo, habrán atendido a <strong>${nextMilestone.toLocaleString("en-US")}</strong> pacientes para el <strong>${escapeHtml(projectedDateStr)}</strong>.
                </p>

                <p style="margin: 0;">
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
