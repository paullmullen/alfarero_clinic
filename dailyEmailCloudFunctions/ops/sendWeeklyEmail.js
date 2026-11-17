import { fetchRecipients } from "../dailyEmail/queries.js";
import { getClinicYMD } from "../dailyEmail/time.js";
import { fetchOperationalReview, renderOperationalReview } from "./operationalReview.js";

export async function sendWeeklyOperationalEmail({ db, sendEmail, endDay = getClinicYMD(), recipientsOverride }) {
  const recipients = recipientsOverride ?? await fetchRecipients({ db });
  if (!recipients.length) return [];
  const review = await fetchOperationalReview({ db, endDay, days: 7 });
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"></head><body style="margin:0;padding:20px;background:#fff;"><div style="max-width:800px;margin:auto;">${renderOperationalReview(review)}<p style="font-family:Arial,sans-serif;font-size:12px;color:#666;">Información disponible al generar el informe; la jornada del viernes puede recibir actualizaciones posteriores.</p></div></body></html>`;
  const results = [];
  for (const { email } of recipients) {
    try {
      await sendEmail({ to: email, subject: `Revisión Operativa Semanal: ${review.startDay} al ${endDay}`, html, attachments: [] });
      results.push({ email, status: "sent" });
    } catch (error) {
      results.push({ email, status: "failed", error: error.message ?? String(error) });
    }
  }
  return results;
}
