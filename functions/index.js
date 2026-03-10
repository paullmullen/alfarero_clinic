import admin from "firebase-admin";

import { getPatientCount } from "./getPatientCount.js";
import { updateStatusChange } from "./updateStatusChange.js";
import { getPatientsData } from "./getPatientsData.js";
import { sendInviteEmail } from "./sendInviteEmail.js";
import { sendInventoryReport } from "./sendInventoryReport.js";
import { sendEmail } from "./email/sendEmail.js";
import { getOpsObservationsFeed } from "./getOpsObservationsFeed.js";
import { receiveBarcodeUpdates } from "./receiveBarcodeUpdates.js";

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
