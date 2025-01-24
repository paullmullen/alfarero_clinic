const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.aggregateTimes = functions.firestore
  .document("run_aggregation/timestamp")
  .onUpdate(async (change, context) => {
    try {
      const before = change.before.data();
      const after = change.after.data();

      // If the `last_updated` field didn't change, exit early
      if (before.last_updated?.isEqual(after.last_updated)) {
        console.log("No change in last_updated, exiting.");
        return null;
      }

      console.log("Aggregation triggered by timestamp update.");

      // Fetch active patients
      const patientsSnapshot = await db
        .collection("patients")
        .where("complete", "==", false)
        .get();

      // If no active patients, set averages to zero
      if (patientsSnapshot.empty) {
        console.log("No active patients, setting averages to zero.");
        const stations = [
          "den",
          "doc",
          "lab",
          "nur",
          "nut",
          "og",
          "ped",
          "pha",
          "pra",
          "psi",
          "pt",
          "reg",
        ];
        const batch = db.batch();
        stations.forEach((station) => {
          const stationRef = db.collection("stats").doc(station);
          batch.update(stationRef, {
            average_waiting_time: 0,
            average_procedure_time: 0,
          });
        });
        await batch.commit();
        return null;
      }

      // Calculate aggregated times
      let stationStats = {};

      for (const doc of patientsSnapshot.docs) {
        const patient = doc.data();
        const { station, status, createdAt, completedAt } = patient;

        if (!station || !createdAt) {
          console.warn(`Skipping patient with missing data: ${doc.id}`);
          continue;
        }

        const createdTime = createdAt.toDate();
        const completedTime = completedAt?.toDate();

        let waitTime = 0;
        let procedureTime = 0;

        if (status === "waiting") {
          waitTime = (new Date() - createdTime) / (1000 * 60); // Minutes
        }

        if (status === "in_process" && completedTime) {
          procedureTime = (completedTime - createdTime) / (1000 * 60); // Minutes
        }

        if (!stationStats[station]) {
          stationStats[station] = { waitTime: 0, procedureTime: 0, count: 0 };
        }

        stationStats[station].waitTime += waitTime;
        stationStats[station].procedureTime += procedureTime;
        stationStats[station].count++;
      }

      // Update Firestore with averages
      const batch = db.batch();
      for (const [station, stats] of Object.entries(stationStats)) {
        const avgWaitTime = stats.count > 0 ? stats.waitTime / stats.count : 0;
        const avgProcedureTime =
          stats.count > 0 ? stats.procedureTime / stats.count : 0;

        const stationRef = db.collection("stats").doc(station);
        batch.update(stationRef, {
          average_waiting_time: avgWaitTime,
          average_procedure_time: avgProcedureTime,
        });
      }

      await batch.commit();
      console.log("Aggregated times updated successfully.");
    } catch (error) {
      console.error("Error in aggregateTimes function:", error);
    }
    return null;
  });
