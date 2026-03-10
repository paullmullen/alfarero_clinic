//***************************************************************** */
// NOTE THAT THIS IS A GOOGLE CLOUD FUNCTION THAT NEEDS TO BE DEPLOYED
// AS A CLOUD FUNCTION AND NOT AS PART OF THE CLIENT SIDE CODE.
//***************************************************************** */

//***************************************************************** */
// PROD VERSION NOTES (unchanged from original)
//***************************************************************** */

import * as functions from "@google-cloud/functions-framework";
import admin from "firebase-admin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

if (!admin.apps.length) {
  admin.initializeApp();
}
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

          // Waiting Time
          if (waiting_start && waiting_end) {
            const waitingTime = Math.abs(
              waiting_end.toDate() - waiting_start.toDate()
            );
            if (!stationWaitingTimes[station])
              stationWaitingTimes[station] = [];
            stationWaitingTimes[station].push(waitingTime);
          }

          // Procedure Time
          if (in_process_start && in_process_end) {
            const procedureTime = Math.abs(
              in_process_end.toDate() - in_process_start.toDate()
            );
            if (!stationProcedureTimes[station])
              stationProcedureTimes[station] = [];
            stationProcedureTimes[station].push(procedureTime);
          }

          // Age & Gender
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

    // Averages
    const waitingAverages = {};
    const procedureAverages = {};

    for (const station in stationWaitingTimes) {
      const times = stationWaitingTimes[station];
      waitingAverages[station] =
        times.reduce((sum, t) => sum + t, 0) / times.length;
    }

    for (const station in stationProcedureTimes) {
      const times = stationProcedureTimes[station];
      procedureAverages[station] =
        times.reduce((sum, t) => sum + t, 0) / times.length;
    }

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
            [`${prefix}waiting_time_data`]:
              stationWaitingTimes[station] || [],
          })
      );
    });

    Object.entries(procedureAverages).forEach(([station]) => {
      updatePromises.push(
        db
          .collection("stats")
          .doc(station)
          .update({
            [`${prefix}avg_procedure_time`]: procedure