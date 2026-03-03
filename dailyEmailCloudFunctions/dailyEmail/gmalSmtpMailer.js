"use strict";

const nodemailer = require("nodemailer");
const { defineSecret } = require("firebase-functions/params");

const GMAIL_USER = defineSecret("GMAIL_USER");
const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");

function getTransporter() {
  const gmailUserRaw = (GMAIL_USER.value() || "").trim();
  const gmailPassRaw = GMAIL_APP_PASSWORD.value() || "";

  const gmailUser = gmailUserRaw.trim();
  const gmailPass = gmailPassRaw.replace(/\s+/g, "");

  console.error("DAILYEMAIL_GMAIL_BUILD_TAG", "2026-03-03");
  console.error("[dailyEmail smtp] secret check", {
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

async function sendEmail({ to, subject, html, attachments = [] }) {
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

module.exports = { sendEmail };
