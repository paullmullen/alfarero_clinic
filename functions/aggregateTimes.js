//***************************************************************** */
// NOTE THAT THIS IS A GOOGLE CLOUD FUNCTION THAT NEEDS TO BE DEPLOYED
// AS A CLOUD FUNCTION AND NOT AS PART OF THE CLIENT SIDE CODE.
//***************************************************************** */

const functions = require("@google-cloud/functions-framework");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

// Initialize Firebase Admin with a specific database URL
admin.initializeApp();

const db = getFirestore(admin.app(), "alfarero-dev"); // specify the db name

functions.cloudEvent("aggregateTimes", async (cloudEvent) => {
  // Log the change (optional)
  console.log("Aggregation triggered by timestamp update");

  console.log(`Function triggered by event on: ${cloudEvent.source}`);
  console.log(`Event type: ${cloudEvent.type}`);

  try {
    // Step 1: Query all patients where complete == false
    const patientsSnapshot = await db
      .collection("patients")
      .where("complete", "==", false)
      .get();

    if (patientsSnapshot.empty) {
      console.log("No active patients found. Resetting averages in stats.");
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
    const stationTimes = {}; // { stationName: [waitingTime1, waitingTime2, ...] }
    const stationProcedureTimes = {}; // { stationName: [procedureTime1, procedureTime2, ...] }

    patientsSnapshot.forEach((doc) => {
      const patient = doc.data();
      const planOfCare = patient.plan_of_care || [];

      planOfCare.forEach((entry) => {
        const { station, waiting_time, in_process_start, in_process_end } =
          entry;

        // Collect waiting time data
        if (station && waiting_time != null) {
          if (!stationTimes[station]) {
            stationTimes[station] = [];
          }
          stationTimes[station].push(waiting_time);
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

    console.log("Collected station waiting times:", stationTimes);
    console.log("Collected station procedure times:", stationProcedureTimes);

    // Step 3: Calculate averages for each station
    const averages = {};
    const procedureAverages = {};

    // Calculate average waiting times
    for (const station in stationTimes) {
      const times = stationTimes[station];
      const total = times.reduce((sum, time) => sum + time, 0);
      const avg = total / times.length;
      averages[station] = avg;
    }

    // Calculate average procedure times
    for (const station in stationProcedureTimes) {
      const times = stationProcedureTimes[station];
      const total = times.reduce((sum, time) => sum + time, 0);
      const avg = total / times.length;
      procedureAverages[station] = avg;
    }

    console.log("Calculated station averages (waiting time):", averages);
    console.log(
      "Calculated station averages (procedure time):",
      procedureAverages
    );

    // Step 4: Update the stats collection
    const updatePromises = [];

    // Update stats collection with waiting_time_data and procedure_time_data
    Object.entries(averages).forEach(([station, avg_waiting_time]) => {
      updatePromises.push(
        db
          .collection("stats")
          .doc(station)
          .update({
            avg_waiting_time,
            waiting_time_data: stationTimes[station], // Store waiting_time_data
            avg_procedure_time: procedureAverages[station] || 0, // If no procedure time, set to 0
            procedure_time_data: stationProcedureTimes[station] || [], // Store procedure_time_data
          })
      );
    });

    // Ensure stations with no active patients are reset to 0 for both waiting_time and procedure_time
    const statsSnapshot = await db.collection("stats").get();
    statsSnapshot.docs.forEach((doc) => {
      if (!averages[doc.id]) {
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
