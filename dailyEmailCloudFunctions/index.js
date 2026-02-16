// index.js
"use strict";

const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");

const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

const { runDailyEmailPipeline } = require("./dailyEmail/pipeline");
const {
  initDailyEmailDeps,
  sendDailyEmails,
} = require("./dailyEmail/sendDailyEmails");

function applyCors(req, res) {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "3600");
}

initializeApp();
const db = getFirestore();

initDailyEmailDeps({ db, Timestamp });

exports.manualDailyEmail = onRequest(
  { timeoutSeconds: 60 },
  async (req, res) => {
    applyCors(req, res);
    if (req.method === "OPTIONS") return res.status(204).send("");

    try {
      const results = await runDailyEmailPipeline({ sendDailyEmails });

      console.log("Daily Email Results:", {
        count: Array.isArray(results) ? results.length : null,
        sample: Array.isArray(results) ? results.slice(0, 3) : results,
      });

      return res.status(200).json({
        message: `Sent ${Array.isArray(results) ? results.length : 0} emails.`,
        results,
      });
    } catch (err) {
      console.error("Unhandled error:", err);
      return res.status(500).json({ error: err.message });
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
    await runDailyEmailPipeline({ sendDailyEmails });
  },
);
