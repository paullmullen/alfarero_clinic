//***************************************************************** */
// NOTE THAT THIS IS A GOOGLE CLOUD FUNCTION THAT NEEDS TO BE DEPLOYED
// AS A CLOUD FUNCTION AND NOT AS PART OF THE CLIENT SIDE CODE.
//***************************************************************** */

const admin = require("firebase-admin");

// Import functions
const { getPatientCount } = require("./getPatientCount");
const { updateStatusChange } = require("./updateStatusChange");
const { getPatientsData } = require("./getPatientsData");
// const { aggregateTimes } = require("./aggregateTimes"); // uncomment only if used

if (!admin.apps.length) {
  admin.initializeApp();
}

// Export functions
exports.getPatientCount = getPatientCount;
exports.updateStatusChange = updateStatusChange;
exports.getPatientsData = getPatientsData;
// exports.aggregateTimes = aggregateTimes;
