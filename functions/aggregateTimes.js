//***************************************************************** */
// NOTE THAT THIS IS A GOOGLE CLOUD FUNCTION THAT NEEDS TO BE DEPLOYED
// AS A CLOUD FUNCTION AND NOT AS PART OF THE CLIENT SIDE CODE.
//***************************************************************** */

const functions = require("@google-cloud/functions-framework");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const { Timestamp } = require("firebase-admin/firestore");

// Initialize Firebase Admin with a specific database URL
admin.initializeApp();

const db = getFirestore(admin.app(), "alfarero-dev"); // specify the db name

functions.cloudEvent("aggregateTimes", async (cloudEvent) => {
  // Log the change (optional)
  console.log("Aggregation triggered by timestamp update");

  console.log(`Function triggered by event on: ${cloudEvent.source}`);
  console.log(`Event type: ${cloudEvent.type}`);
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Set time to midnight
  const todayMidnight = Timestamp.fromDate(now);
  try {
    // Step 1: Query all patients for today
    const patientsSnapshot = await db
      .collection("patients")
      .where("start_time", ">", todayMidnight)
      .get();

    console.log("# Patients Retrieved:", patientsSnapshot.size);
    if (patientsSnapshot.empty) {
      // Reset averages in stats collection if no active patients
      const statsSnapshot = await db.collection("stats").get();
      const resetPromises = statsSnapshot.docs.map((doc) =>
        doc.ref.update({
          avg_waiting_time: 0,
          avg_procedure_time: 0,
          waiting_time_data: [],
          procedure_time_data: [], // Reset procedure_time_data as well
        })
      );
      await Promise.all(resetPromises);
      console.log(
        "All station averages reset to 0 and waiting_time_data, procedure_time_data cleared."
      );
      return;
    }

    // Step 2: Collect waiting times and procedure times for each station
    const stationProcedureTimes = {}; // { stationName: [procedureTime1, procedureTime2, ...] }
    const stationWaitingTimes = {}; // { stationName: [waitingTime1, waitngTime2, ...] }

    patientsSnapshot.forEach((doc) => {
      const patient = doc.data();
      const planOfCare = patient.plan_of_care || [];

      planOfCare.forEach((entry) => {
        const {
          station,
          waiting_start,
          waiting_end,
          in_process_start,
          in_process_end,
        } = entry;

        // Collect waiting time data (difference between waiting_end and waiting_start)
        if (station && waiting_start && waiting_end) {
          const waitingTime = waiting_end.toDate() - waiting_start.toDate();
          if (!stationWaitingTimes[station]) {
            stationWaitingTimes[station] = [];
          }
          stationWaitingTimes[station].push(waitingTime);
        }

        // Collect procedure time data (difference between in_process_end and in_process_start)
        if (station && in_process_start && in_process_end) {
          const procedureTime =
            in_process_end.toDate() - in_process_start.toDate();
          if (!stationProcedureTimes[station]) {
            stationProcedureTimes[station] = [];
          }
          stationProcedureTimes[station].push(procedureTime);
        }
      });
    });

    console.log("Collected station waiting times:", stationWaitingTimes);
    console.log("Collected station procedure times:", stationProcedureTimes);

    // Step 3: Calculate averages for each station
    const waitingAverages = {};
    const procedureAverages = {};

    // Calculate average waiting times
    for (const station in stationWaitingTimes) {
      const times = stationWaitingTimes[station];
      const total = times.reduce((sum, time) => sum + time, 0);
      const avg = total / times.length;
      waitingAverages[station] = avg;
    }

    // Calculate average procedure times
    for (const station in stationProcedureTimes) {
      const times = stationProcedureTimes[station];
      const total = times.reduce((sum, time) => sum + time, 0);
      const avg = total / times.length;
      procedureAverages[station] = avg;
    }

    console.log("Calculated station averages (waiting time):", waitingAverages);
    console.log(
      "Calculated station averages (procedure time):",
      procedureAverages
    );

    // Step 4: Update the stats collection
    const updatePromises = [];

    // Update stats collection with waiting_time_data and procedure_time_data
    Object.entries(waitingAverages).forEach(([station]) => {
      updatePromises.push(
        db
          .collection("stats")
          .doc(station)
          .update({
            avg_waiting_time: waitingAverages[station],
            waiting_time_data: stationWaitingTimes[station], // Store waiting_time_data
            avg_procedure_time: procedureAverages[station] || 0, // If no procedure time, set to 0
            procedure_time_data: stationProcedureTimes[station] || [], // Store procedure_time_data
          })
      );
    });

    // Ensure stations with no active patients are reset to 0 for both waiting_time and procedure_time
    const statsSnapshot = await db.collection("stats").get();
    statsSnapshot.docs.forEach((doc) => {
      if (!waitingAverages[doc.id]) {
        updatePromises.push(
          doc.ref.update({
            avg_waiting_time: 0,
            waiting_time_data: [],
            avg_procedure_time: 0,
            procedure_time_data: [], // Clear procedure_time_data if no active patients
          })
        );
      }
    });

    await Promise.all(updatePromises);
    console.log(
      "Stats collection updated successfully with waiting_time_data and procedure_time_data."
    );
  } catch (error) {
    console.error("Error processing aggregation:", error);
  }
});
