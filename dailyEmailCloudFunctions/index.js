//***************************************************************** */
// NOTE THAT THIS IS A GOOGLE CLOUD FUNCTION THAT NEEDS TO BE DEPLOYED
// AS A CLOUD FUNCTION AND NOT AS PART OF THE CLIENT SIDE CODE.
//***************************************************************** */

import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

import { runDailyEmailPipeline } from "./dailyEmail/pipeline.js";
import {
  initDailyEmailDeps,
  sendDailyEmails,
} from "./dailyEmail/sendDailyEmails.js";

// --- SINGLE initialization block ---
initializeApp();

const db = getFirestore();

// Use Firestore emulator only when running locally
if (process.env.FUNCTIONS_EMULATOR) {
  db.settings({
    host: "127.0.0.1:8080",
    ssl: false,
  });
}

initDailyEmailDeps({ db, Timestamp });

function applyCors(req, res) {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "3600");
}

export const manualDailyEmail = onRequest(
  {
    memory: "512MiB",
    timeoutSeconds: 60,
    secrets: [
      "MAIL_PROVIDER",
      "GMAIL_USER",
      "GMAIL_APP_PASSWORD",
      "O365_TENANT_ID",
      "O365_CLIENT_ID",
      "O365_CLIENT_SECRET",
      "O365_SENDER",
    ],
  },
  async (req, res) => {
    applyCors(req, res);
    if (req.method === "OPTIONS") return res.status(204).send("");

    try {
      /**
       * DEVELOPMENT / DEBUG SUPPORT
       *
       * The client may optionally pass:
       *   { reportShiftDays: N }
       *
       * Meaning:
       *   "Generate the report as if today were N clinic-days earlier."
       *
       * If omitted or invalid, defaults to 0 (normal production behavior).
       */
      const rawShift = Number(req.body?.reportShiftDays ?? 0);

      const reportShiftDays = Number.isInteger(rawShift)
        ? Math.max(0, Math.min(rawShift, 14)) // clamp to 0–14 for safety
        : 0;

      const results = await runDailyEmailPipeline({
        sendDailyEmails,
        reportShiftDays,
      });

      console.log("Daily Email Results:", {
        reportShiftDays,
        count: Array.isArray(results) ? results.length : null,
        sample: Array.isArray(results) ? results.slice(0, 3) : results,
      });

      return res.status(200).json({
        message: `Sent ${Array.isArray(results) ? results.length : 0} emails.`,
        reportShiftDays,
        results,
      });
    } catch (err) {
      console.error("Unhandled error:", err);
      return res.status(500).json({ error: err.message });
    }
  },
);

export const scheduledDailyEmail = onSchedule(
  {
    memory: "512MiB",
    schedule: "0 17 * * *",
    timeZone: "America/Guatemala",
    timeoutSeconds: 60,
    secrets: [
      "MAIL_PROVIDER",
      "GMAIL_USER",
      "GMAIL_APP_PASSWORD",
      "O365_TENANT_ID",
      "O365_CLIENT_ID",
      "O365_CLIENT_SECRET",
      "O365_SENDER",
    ],
  },
  async () => {
    console.log("scheduledDailyEmail: starting");

    await runDailyEmailPipeline({
      sendDailyEmails,
      reportShiftDays: 0, // 🔒 force production behavior
    });

    console.log("scheduledDailyEmail: complete");
  },
);
