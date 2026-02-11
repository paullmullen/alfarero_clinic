//***************************************************************** */
// NOTE THAT THIS IS A GOOGLE CLOUD FUNCTION THAT NEEDS TO BE DEPLOYED
// AS A CLOUD FUNCTION AND NOT AS PART OF THE CLIENT SIDE CODE.
//***************************************************************** */

const admin = require("firebase-admin");

// Import functions (existing)
const { getPatientCount } = require("./getPatientCount");
const { updateStatusChange } = require("./updateStatusChange");
const { getPatientsData } = require("./getPatientsData");
// const { aggregateTimes } = require("./aggregateTimes"); // uncomment only if used

// New: callable invite email (client calls this)
const { sendInviteEmail } = require("./sendInviteEmail");

// Future: Firestore trigger for inventory report emails
// const { inventoryReportEmail } = require("./inventoryReportEmail");

if (!admin.apps.length) {
  admin.initializeApp();
}

// Export functions (existing)
exports.getPatientCount = getPatientCount;
exports.updateStatusChange = updateStatusChange;
exports.getPatientsData = getPatientsData;
// exports.aggregateTimes = aggregateTimes;

// Export functions (new)
exports.sendInviteEmail = sendInviteEmail;

// Future export
// exports.inventoryReportEmail = inventoryReportEmail;
