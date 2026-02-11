"use strict";

const nodemailer = require("nodemailer");
const { defineSecret } = require("firebase-functions/params");

// Store these as secrets (not in code)
const GMAIL_USER = defineSecret("GMAIL_USER");
const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");

function getTransporter() {
  // Creating per-call is fine; nodemailer caches connections internally by default.
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER.value(),
      pass: GMAIL_APP_PASSWORD.value(),
    },
  });
}

async function sendEmail({ to, subject, html }) {
  if (!to || !subject || !html) {
    throw new Error("sendEmail missing required fields: to, subject, html");
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from: GMAIL_USER.value(),
    to,
    subject,
    html,
  });
}

module.exports = {
  sendEmail,
  GMAIL_USER,
  GMAIL_APP_PASSWORD,
};
