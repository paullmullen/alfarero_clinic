//***************************************************************** */
// NOTE THAT THIS IS A GOOGLE CLOUD FUNCTION THAT NEEDS TO BE DEPLOYED
// AS A CLOUD FUNCTION AND NOT AS PART OF THE CLIENT SIDE CODE.
//***************************************************************** */

const admin = require("firebase-admin");
const functions = require("firebase-functions");

// Import your functions from their respective files
// const { aggregateTimes } = require("./aggregateTimes");
const { getPatientCount } = require("./getPatientCount");
const { updateStatusChange } = require("./updateStatusChange");
const { getPatientsData } = require("./getPatientsData");

admin.initializeApp();

// Export the functions to Firebase
exports.aggregateTimes = aggregateTimes;
exports.getPatientCount = getPatientCount;
exports.updateStatusChange = updateStatusChange;
exports.getPatientsData = this.getPatientsData;
