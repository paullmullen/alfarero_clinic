"use strict";

const { defineSecret } = require("firebase-functions/params");

const MAIL_PROVIDER = defineSecret("MAIL_PROVIDER"); // "gmail" | "graph"

async function sendEmail(opts) {
  const provider = (MAIL_PROVIDER.value() || "gmail").trim().toLowerCase();
  console.error("[dailyEmail mail] provider:", provider);

  if (provider === "graph") {
    const graph = require("./msGraphMailer");
    return graph.sendEmail(opts);
  }

  const gmail = require("./gmailSmtpMailer");
  return gmail.sendEmail(opts);
}

module.exports = { sendEmail, MAIL_PROVIDER };
