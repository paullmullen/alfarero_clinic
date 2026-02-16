"use strict";

const { onRequest } = require("firebase-functions/v2/https");
const { sendEmail } = require("./mailer");

exports.sendemail = onRequest(
  {
    timeoutSeconds: 120,
    secrets: ["GMAIL_USER", "GMAIL_APP_PASSWORD"],
  },
  async (req, res) => {
    // CORS (simple, permissive)
    res.set("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(204).send("");
    if (req.method !== "POST")
      return res.status(405).send("Method Not Allowed");

    // Defensive body parsing
    let body = req.body || {};
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        // leave as-is
      }
    }

    const to = body?.to ?? body?.data?.to ?? null;
    const subject = body?.subject ?? body?.data?.subject ?? null;
    const html = body?.html ?? body?.data?.html ?? null;

    console.error("[sendemail] request summary", {
      contentType: req.headers["content-type"],
      keys: Object.keys(body || {}),
      toPresent: !!to,
      subjectPresent: !!subject,
      htmlLen: typeof html === "string" ? html.length : 0,
    });

    try {
      await sendEmail({ to, subject, html });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[sendemail] error", {
        message: err?.message,
        stack: err?.stack,
      });
      return res.status(500).json({ ok: false, error: err.message });
    }
  },
);
