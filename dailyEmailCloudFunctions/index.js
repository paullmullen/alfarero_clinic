// index.js
"use strict";

const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");

const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

const { runDailyEmailPipeline } = require("./dailyEmail/pipeline");
const {
  initDailyEmailDeps,
  sendDailyEmails,
} = require("./dailyEmail/sendDailyEmails");

// --- CORS helper (unchanged) ---
function applyCors(req, res) {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "3600");
}

// Initialize Firebase Admin SDK (unchanged behavior)
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

// Inject deps once
initDailyEmailDeps({ db, Timestamp });

exports.manualDailyEmail = onRequest(
  { timeoutSeconds: 60 },
  async (req, res) => {
    applyCors(req, res);
    if (req.method === "OPTIONS") return res.status(204).send("");

    try {
      const results = await runDailyEmailPipeline({ sendDailyEmails });
      res
        .status(200)
        .json({ message: `Sent ${results.length} emails.`, results });
    } catch (err) {
      console.error("Unhandled error:", err);
      res.status(500).json({ error: err.message });
    }
  },
);

exports.scheduledDailyEmail = onSchedule(
  {
    schedule: "0 17 * * *",
    timeZone: "America/Guatemala",
    timeoutSeconds: 60,
  },
  async () => {
    console.log("Exito.");
    try {
      await runDailyEmailPipeline({ sendDailyEmails });
    } catch (err) {
      console.error("Error:", err);
    }
  },
);
