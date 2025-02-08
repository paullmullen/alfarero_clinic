const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.getAnfiData = functions.https.onCall(async (data, context) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0);

    // Convert JS Date to Firestore Timestamp
    const todayTimestamp = admin.firestore.Timestamp.fromDate(today);
    const tomorrowTimestamp = admin.firestore.Timestamp.fromDate(tomorrow);

    // Fetch patients matching criteria
    const patientsQuery = db
      .collection("patients")
      .where("start_time", ">=", todayTimestamp)
      .where("start_time", "<", tomorrowTimestamp)
      .where("complete", "==", false)
      .orderBy("start_time");

    const patientsSnapshot = await patientsQuery.get();
    const patients = patientsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log("Patients Data:", JSON.stringify(patients, null, 2));

    return { patients };
  } catch (error) {
    console.error("Error fetching patient data:", error);
    throw new functions.https.HttpsError("internal", "Failed to fetch data.");
  }
});
