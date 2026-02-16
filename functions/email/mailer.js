"use strict";

const nodemailer = require("nodemailer");
const { defineSecret } = require("firebase-functions/params");

// Secrets (set via: firebase functions:secrets:set ...)
const GMAIL_USER = defineSecret("GMAIL_USER");
const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");

function getTransporter() {
  const gmailUserRaw = (GMAIL_USER.value() || "").trim();
  const gmailPassRaw = GMAIL_APP_PASSWORD.value() || "";

  // Strip spaces/newlines from app password
  const gmailUser = gmailUserRaw.trim();
  const gmailPass = gmailPassRaw.replace(/\s+/g, "");

  // Log to stderr so it shows up where you're already looking
  console.error("SENDMAIL_BUILD_TAG", "2026-02-15e");
  console.error("[smtp] secret check", {
    userPresent: !!gmailUser,
    userLooksGmail: gmailUser.endsWith("@gmail.com"),
    passLenRaw: gmailPassRaw.length,
    passLenNoSpaces: gmailPass.length,
  });

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: gmailUser, pass: gmailPass },
  });
}

async function sendEmail({ to, subject, html, attachments }) {
  if (!to || !subject || !html) {
    throw new Error("sendEmail missing required fields: to, subject, html");
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from: (GMAIL_USER.value() || "").trim(),
    to,
    subject,
    html,
    attachments,
  });
}

module.exports = {
  sendEmail,
};
