import admin from "firebase-admin";

import { getPatientCount } from "./getPatientCount.js";
import { updateStatusChange } from "./updateStatusChange.js";
export { updateStatusChangeV2 } from "./updateStatusChangeV2.js";
import { getPatientsData } from "./getPatientsData.js";
import { sendInviteEmail } from "./sendInviteEmail.js";
import { sendInventoryReport } from "./sendInventoryReport.js";
import { sendEmail } from "./email/sendEmail.js";
import { getOpsObservationsFeed } from "./getOpsObservationsFeed.js";
import { generateScannerCloudQr } from "./generateScannerCloudQr.js";
import { generateScannerStationQr } from "./generateScannerStationQr.js";
// import { receiveBarcodeUpdates } from "./receiveBarcodeUpdates.js";

const db = admin.firestore();

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
  // receiveBarcodeUpdates,
  generateScannerCloudQr,
  generateScannerStationQr,
};
