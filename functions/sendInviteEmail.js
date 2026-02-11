"use strict";

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const {
  sendEmail,
  GMAIL_USER,
  GMAIL_APP_PASSWORD,
} = require("./email/sendEmail");

if (!admin.apps.length) admin.initializeApp();
const db = getFirestore();

async function getUserByAuthUid(uid) {
  const snap = await db
    .collection("users")
    .where("uid", "==", uid)
    .limit(1)
    .get();
  const doc = snap.docs[0];
  return doc ? { id: doc.id, ...doc.data() } : null;
}

exports.sendInviteEmail = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 120,
    secrets: [GMAIL_USER, GMAIL_APP_PASSWORD],
  },
  async (request) => {
    // 1) Require authenticated caller
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }

    // 2) Require permission (settings admins)
    const user = await getUserByAuthUid(request.auth.uid);
    if (!user?.permissions?.settings) {
      throw new HttpsError("permission-denied", "Missing settings permission.");
    }

    // 3) Validate input
    const email = String(request.data?.email || "")
      .trim()
      .toLowerCase();
    if (!email) {
      throw new HttpsError("invalid-argument", "Email is required.");
    }
    // simple email sanity check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpsError("invalid-argument", "Invalid email.");
    }

    // 4) Load template from Firestore
    const templateRef = db.collection("signupMessage").doc("email_message");
    const templateSnap = await templateRef.get();
    if (!templateSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "Email message template not found.",
      );
    }

    const { text, subjectLine } = templateSnap.data() || {};
    if (!text || !subjectLine) {
      throw new HttpsError(
        "failed-precondition",
        "Template missing text or subjectLine.",
      );
    }

    // 5) Send email
    await sendEmail({
      to: email,
      subject: subjectLine,
      html: text,
    });

    return { ok: true };
  },
);
