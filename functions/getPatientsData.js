const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

exports.fetchPatientsData = functions.https.onCall(async (data, context) => {
  const { dateRange } = data;

  if (!dateRange || dateRange.length !== 2) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "dateRange must be an array with two timestamps."
    );
  }

  const startDate = admin.firestore.Timestamp.fromMillis(dateRange[0]);
  const endDate = admin.firestore.Timestamp.fromMillis(dateRange[1]);

  const patientsData = [];
  const patientsCollection = db.collection("patients");
  const patientsSnapshot = await patientsCollection.get();

  patientsSnapshot.forEach((doc) => {
    const {
      pt_no,
      patient_name,
      start_time,
      reason_for_visit,
      type_of_visit,
      plan_of_care,
      complete,
      gender,
      age_group,
    } = doc.data();

    let patientPoc = [];
    let totalWait = 0;

    // Process plan_of_care
    plan_of_care.forEach((poc) => {
      if (poc.status === "complete") {
        patientPoc.push(poc.station);
      }
      if (poc.waiting_time) {
        totalWait += poc.waiting_time;
      }
    });

    const pocString = patientPoc.join(", ");

    // Filter data within the specified date range
    if (
      start_time.toMillis() >= startDate.toMillis() &&
      start_time.toMillis() <= endDate.toMillis()
    ) {
      patientsData.push({
        pt_no,
        patient_name,
        date: start_time.toDate().toLocaleDateString("en-US"),
        start_time: start_time
          .toDate()
          .toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        reason_for_visit,
        type_of_visit,
        plan_of_care: pocString,
        total_wait: Math.round(totalWait / 60),
        complete,
        gender,
        age_group,
      });
    }
  });

  return { patientsData };
});
