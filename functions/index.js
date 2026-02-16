//***************************************************************** */
// NOTE THAT THIS IS A GOOGLE CLOUD FUNCTION THAT NEEDS TO BE DEPLOYED
// AS A CLOUD FUNCTION AND NOT AS PART OF THE CLIENT SIDE CODE.
//***************************************************************** */

const admin = require("firebase-admin");

const { getPatientCount } = require("./getPatientCount");
const { updateStatusChange } = require("./updateStatusChange");
const { getPatientsData } = require("./getPatientsData");
const { sendInviteEmail } = require("./sendInviteEmail");
const { sendInventoryReport } = require("./sendInventoryReport");

// ✅ NEW: sendemail (Gen-2, Cloud Run)
const { sendemail } = require("./email/sendemail");

if (!admin.apps.length) {
  admin.initializeApp();
}

exports.getPatientCount = getPatientCount;
exports.updateStatusChange = updateStatusChange;
exports.getPatientsData = getPatientsData;

exports.sendInviteEmail = sendInviteEmail;
exports.sendInventoryReport = sendInventoryReport;

// ✅ Export sendemail endpoint
exports.sendemail = sendemail;
