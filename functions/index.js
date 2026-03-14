import admin from "firebase-admin";

import { getPatientCount } from "./getPatientCount.js";
import { updateStatusChange } from "./updateStatusChange.js";
import { getPatientsData } from "./getPatientsData.js";
import { sendInviteEmail } from "./sendInviteEmail.js";
import { sendInventoryReport } from "./sendInventoryReport.js";
import { sendEmail } from "./email/sendEmail.js";
import { getOpsObservationsFeed } from "./getOpsObservationsFeed.js";
import { receiveBarcodeUpdates } from "./receiveBarcodeUpdates.js";

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

// Use Firestore emulator only when running locally
if (process.env.FUNCTIONS_EMULATOR) {
  db.settings({
    host: "127.0.0.1:8080",
    ssl: false,
  });
}

export { db };

if (!admin.apps.length) {
  admin.initializeApp();
}

export {
  getPatientCount,
  updateStatusChange,
  getPatientsData,
  sendInviteEmail,
  sendInventoryReport,
  sendEmail,
  getOpsObservationsFeed,
  receiveBarcodeUpdates,
};
