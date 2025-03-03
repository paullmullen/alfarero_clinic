//***************************************************************** */
// NOTE THAT THIS IS A GOOGLE CLOUD FUNCTION THAT NEEDS TO BE DEPLOYED
// AS A CLOUD FUNCTION AND NOT AS PART OF THE CLIENT SIDE CODE.
//***************************************************************** */

//***************************************************************** */
//
// PROD VERSION
//
// THERE ARE TWO DIFFERENT AGGREGATE-TIMES.JS FILES.  ONE FOR DEV AND ONE
// FOR PROD.  THE ONLY DIFFERENCE ARE THESE TWO LINES
//
// const db = getFirestore(admin.app(), "alfarero-dev");
// ****  THERE IS NO DB NAMED IN THE PROD VERSION.
//
//  functions.cloudEvent("aggregateTimes-dev", async () => {
// **** THE ENTRY POINT FOR THE PROD VERSION IS DIFFERENT FROM THE DEV VERSION

// This version should be triggered by a cloud trigger configured as follows:
// Firestore Trigger
// Event Type: google.cloud.firestore.document.v1.updated
// Region: nam5
// Database: alfarero-dev
// Service URL Path:  //firestore.googleapis.com/projects/alfarero-478ad/databases/alfarero-dev/run_aggregation/timestamp/last_updated
//
// It requires a package.json file with the following dependencies:
// {
//   "dependencies": {
//     "@google-cloud/functions-framework": "^3.0.0",
//     "firebase-admin": "^11.0.0",
//       "firebase-functions": "^4.0.0",
//
//     "protobufjs": "^7.0.0"
//   }
// }
//
//***************************************************************** */

const functions = require("@google-cloud/functions-framework");
const admin = require("firebase-admin");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

admin.initializeApp();
const db = getFirestore(admin.app(), "alfarero-dev");

async function processAggregation(startTime, endTime, prefix = "") {
  try {
    const patientsSnapshot = await db
      .collection("patients")
      .where("start_time", ">", startTime)
      .where("start_time", "<=", endTime)
      .get();

    if (patientsSnapshot.empty) {
      const statsSnapshot = await db.collection("stats").get();
      const resetPromises = statsSnapshot.docs.map((doc) =>
        doc.ref.update({
          [`${prefix}avg_waiting_time`]: 0,
          [`${prefix}avg_procedure_time`]: 0,
          [`${prefix}waiting_time_data`]: [],
          [`${prefix}procedure_time_data`]: [],
          [`${prefix}count`]: 0,
          [`${prefix}adult_masculine`]: 0,
          [`${prefix}adult_feminine`]: 0,
          [`${prefix}child_masculine`]: 0,
          [`${prefix}child_feminine`]: 0,
        })
      );
      await Promise.all(resetPromises);
      return;
    }

    const stationProcedureTimes = {};
    const stationWaitingTimes = {};
    const ageGenderCounts = {};

    patientsSnapshot.forEach((doc) => {
      const patient = doc.data();
      const planOfCare = patient.plan_of_care || [];

      planOfCare.forEach(
        ({
          station,
          waiting_start,
          waiting_end,
          in_process_start,
          in_process_end,
          status,
        }) => {
          if (!station) return;

          // Waiting Time Calculation
          if (waiting_start && waiting_end) {
            const waitingTime = Math.abs(
              waiting_end.toDate() - waiting_start.toDate()
            );
            if (!stationWaitingTimes[station])
              stationWaitingTimes[station] = [];
            stationWaitingTimes[station].push(waitingTime);
          }

          // Procedure Time Calculation
          if (in_process_start && in_process_end) {
            const procedureTime = Math.abs(
              in_process_end.toDate() - in_process_start.toDate()
            );
            if (!stationProcedureTimes[station])
              stationProcedureTimes[station] = [];
            stationProcedureTimes[station].push(procedureTime);
          }

          // Age & Gender Categorization
          if (!ageGenderCounts[station]) {
            ageGenderCounts[station] = {
              adultMasculine: 0,
              adultFeminine: 0,
              childMasculine: 0,
              childFeminine: 0,
              totalCount: 0,
            };
          }

          if (
            patient.gender === "masculine" &&
            patient.age_group === "adult" &&
            status !== "pending"
          ) {
            ageGenderCounts[station].adultMasculine++;
            ageGenderCounts[station].totalCount++;
          }
          if (
            patient.gender === "feminine" &&
            patient.age_group === "adult" &&
            status !== "pending"
          ) {
            ageGenderCounts[station].adultFeminine++;
            ageGenderCounts[station].totalCount++;
          }
          if (
            patient.gender === "masculine" &&
            patient.age_group === "child" &&
            status !== "pending"
          ) {
            ageGenderCounts[station].childMasculine++;
            ageGenderCounts[station].totalCount++;
          }
          if (
            patient.gender === "feminine" &&
            patient.age_group === "child" &&
            status !== "pending"
          ) {
            ageGenderCounts[station].childFeminine++;
            ageGenderCounts[station].totalCount++;
          }
        }
      );
    });

    // Calculate Averages
    const waitingAverages = {};
    const procedureAverages = {};

    for (const station in stationWaitingTimes) {
      const times = stationWaitingTimes[station];
      waitingAverages[station] =
        times.reduce((sum, time) => sum + time, 0) / times.length;
    }

    for (const station in stationProcedureTimes) {
      const times = stationProcedureTimes[station];
      procedureAverages[station] =
        times.reduce((sum, time) => sum + time, 0) / times.length;
    }

    // Firestore Updates
    const updatePromises = [];

    console.log("waiting averages", waitingAverages);
    console.log("procedure_averages", procedureAverages);
    console.log("agegender", ageGenderCounts);

    Object.entries(waitingAverages).forEach(([station]) => {
      updatePromises.push(
        db
          .collection("stats")
          .doc(station)
          .update({
            [`${prefix}avg_waiting_time`]: waitingAverages[station] || 0,
            [`${prefix}waiting_time_data`]: stationWaitingTimes[station] || [],
          })
      );
    });

    Object.entries(procedureAverages).forEach(([station]) => {
      updatePromises.push(
        db
          .collection("stats")
          .doc(station)
          .update({
            [`${prefix}avg_procedure_time`]: procedureAverages[station] || 0,
            [`${prefix}procedure_time_data`]:
              stationProcedureTimes[station] || [],
          })
      );
    });

    Object.entries(ageGenderCounts).forEach(([station, counts]) => {
      updatePromises.push(
        db
          .collection("stats")
          .doc(station)
          .update({
            [`${prefix}adult_masculine`]: counts.adultMasculine,
            [`${prefix}adult_feminine`]: counts.adultFeminine,
            [`${prefix}child_masculine`]: counts.childMasculine,
            [`${prefix}child_feminine`]: counts.childFeminine,
            [`${prefix}count`]: counts.totalCount,
          })
      );
    });

    await Promise.all(updatePromises);
  } catch (error) {
    console.error("Error processing aggregation:", error);
  }
}

functions.cloudEvent("aggregateTimes-dev", async () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayMidnight = Timestamp.fromDate(now);
  await processAggregation(todayMidnight, Timestamp.now(), "");

  const rangeDoc = await db
    .collection("run_aggregation")
    .doc("timestamp")
    .get();
  if (rangeDoc.exists) {
    const { range_start, range_end } = rangeDoc.data();
    if (range_start && range_end) {
      await processAggregation(range_start, range_end, "range_");
    }
  }
});
