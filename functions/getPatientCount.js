const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

const db = admin.firestore();

exports.getPatientCount = functions.https.onCall(async (data, context) => {
  try {
    const { stationName, startDateTimestamp, endDateTimestamp } = data;

    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }
    if (!stationName || !startDateTimestamp || !endDateTimestamp) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing stationName, startDate, or endDate."
      );
    }
    const startDate = new Date(startDateTimestamp);
    const endDate = new Date(endDateTimestamp);

    const query = db
      .collection("patients")
      .where("start_time", ">=", startDate)
      .where("start_time", "<=", endDate);

    const querySnapshot = await query.get();

    let count = 0;
    let adultMasculine = 0;
    let adultFeminine = 0;
    let childMasculine = 0;
    let childFeminine = 0;

    querySnapshot.forEach((doc) => {
      const patient = doc.data();
      patient.plan_of_care.forEach((s) => {
        count += s.station === stationName && s.status !== "pending" ? 1 : 0;
      });
      if (patient.gender == "masculine" && patient.age_group == "adult") {
        adultMasculine++;
      }
      if (patient.gender == "feminine" && patient.age_group == "adult") {
        adultFeminine++;
      }
      if (patient.gender == "masculine" && patient.age_group == "child") {
        childMasculine++;
      }
      if (patient.gender == "feminine" && patient.age_group == "child") {
        childFeminine++;
      }
    });

    return {
      count,
      adultMasculine,
      adultFeminine,
      childMasculine,
      childFeminine,
    };
  } catch (error) {
    console.error("Error in getPatientCount function:", error);
    throw error;
  }
});
