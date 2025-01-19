import { firestore } from "./../helpers/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
} from "firebase/firestore"; // Import necessary methods

export const handleStatusChange = async (value, hoveredRowKey, station) => {
  try {
    await firestore.runTransaction(async (transaction) => {
      const docPatientRef = firestore.collection("patients").doc(hoveredRowKey);
      const docStatsRef = firestore.collection("stats").doc(station);

      const [docPatient, docStats] = await Promise.all([
        transaction.get(docPatientRef),
        transaction.get(docStatsRef),
      ]);
      let endOfWait = false;
      let endOfProcess = false;

      //start by updating the patient waiting statistics
      if (docPatient.exists) {
        const data = docPatient.data();
        const updatedPlanOfCare = data.plan_of_care?.map((item) => {
          if (item.station === station) {
            const updatedItem = {
              ...item,
              status: value,
            };

            if (value === "waiting" && item.status !== "waiting") {
              // was not waiting, but now is waiting.   Set start-waiting time.
              updatedItem.wait_start = Math.floor(Date.now() / 1000);
            } else if (value === "in_process" && item.status !== "in_process") {
              // was not in process but now is in process. Set start-in process time.
              updatedItem.procedure_start = Math.floor(Date.now() / 1000);
            }

            if (value !== "waiting" && item.status === "waiting") {
              // is not waiting, but was waiting.  Set end-waiting time and total waiting time.
              updatedItem.wait_end = Math.floor(Date.now() / 1000);
              updatedItem.waiting_time = Math.abs(
                updatedItem.wait_end - updatedItem.wait_start
              );
              endOfWait = true;
            } else if (value !== "in_process" && item.status === "in_process") {
              //is not in process but was in process.  Set end-in process time and total in process time.
              updatedItem.procedure_end = Math.floor(Date.now() / 1000);
              updatedItem.procedure_time = Math.abs(
                updatedItem.procedure_end - updatedItem.procedure_start
              );
              endOfProcess = true;
            }
            return updatedItem;
          }
          return item;
        });

        transaction.update(docPatientRef, {
          plan_of_care: updatedPlanOfCare,
        });

        // patient records are updated, now update the stats data
        if (docStats.exists) {
          const statsData = docStats.data();
          const updatedItem = updatedPlanOfCare.find(
            (item) => item.station === station
          );

          if (endOfWait) {
            // we have an existing wait start_time and we've just changed wait
            const waitDifference = Math.abs(updatedItem.waiting_time);

            try {
              transaction.update(docStatsRef, {
                waiting_time_data: [
                  ...(statsData.waiting_time_data || []),
                  waitDifference,
                ], //.filter((time) => !isNaN(time)),
              });
            } catch (error) {
              console.log(error);
            }
          }

          if (endOfProcess) {
            // we have an existing  in_process time and we just changed in_process

            const inProcessDifference = Math.abs(updatedItem.procedure_time);
            transaction.update(docStatsRef, {
              procedure_time_data: [
                ...(statsData.procedure_time_data || []),
                inProcessDifference,
              ], //.filter((time) => !isNaN(time)),
            });
          }

          //stats arrays are updated, now calculate statistics
          const { waiting_time_data, procedure_time_data, number_of_patients } =
            statsData;

          if (waiting_time_data && number_of_patients) {
            const validWaitingTimeData = waiting_time_data.filter(
              (time) => !isNaN(time)
            );
            const waitingAverage = Math.floor(
              validWaitingTimeData.reduce((acc, time) => acc + time, 0) /
                number_of_patients
            );
            transaction.update(docStatsRef, {
              avg_waiting_time: waitingAverage,
            });
          }

          if (number_of_patients) {
            const validProcedureTimeData = procedure_time_data.filter(
              (time) => !isNaN(time)
            );
            const procedureAverage = Math.floor(
              validProcedureTimeData.reduce((acc, time) => acc + time, 0) /
                number_of_patients
            );
            transaction.update(docStatsRef, {
              avg_procedure_time: procedureAverage,
            });

            if (value === "in_process" || value === "waiting") {
              transaction.update(docPatientRef, {
                avg_time: Math.floor(Date.now() / 1000),
              });
            }
          }
        }
      } else {
        console.log("No such document!");
      }
    });
  } catch (error) {
    console.log("Error updating status:", error);
  }
};

export const handleDelete = async (hoveredRowKey, history) => {
  const docPatientRefFin = firestore.collection("patients").doc(hoveredRowKey);
  let result = [];
  if (docPatientRefFin) {
    try {
      await firestore.runTransaction(async (transaction) => {
        const doc = await transaction.get(docPatientRefFin);
        const patData = doc.data();
        // const poc = patData.plan_of_care;

        if (doc.exists) {
          await docPatientRefFin.update({
            complete: true,
          });
          //now pass the proper stations to the survey page
          // result = poc
          //   .filter((item) => item.status !== 'pending')
          //   .map((item) => item.station);
          result = { age_group: patData.age_group, gender: patData.gender };
        } else {
          console.log("HANDLE_DELETE: No such document.");
        }
      });
    } catch (error) {
      console.log("HANDLE_DELETE: Error getting document:", error);
    }
  } else {
    console.log("HANDLE_DELETE: No such document.");
  }

  history.push({ pathname: "/survey", state: result });
};

export const handleReadmitClick = async (patientID) => {
  const docPatientRefFin = firestore.collection("patients").doc(patientID);

  if (docPatientRefFin) {
    try {
      await firestore.runTransaction(async (transaction) => {
        const doc = await transaction.get(docPatientRefFin);

        if (doc.exists) {
          await docPatientRefFin.update({
            complete: false,
          });
        } else {
          console.log("HANDLE_READMIT: No such document.");
        }
      });
    } catch (error) {
      console.log("HANDLE_READMIT: Error getting document:", error);
    }
  } else {
    console.log("HANDLE_READMIT: No such document.");
  }
};

export const cleanPaulTests = async () => {
  console.log("Cleaning Paul Tests");

  try {
    // Create a query to find patients with the name "Paul"
    const patientsRef = collection(firestore, "patients");
    const q = query(patientsRef, where("patient_name", "==", "Paul"));

    // Get the documents matching the query
    const querySnapshot = await getDocs(q);

    // Delete each document
    querySnapshot.forEach(async (doc) => {
      await deleteDoc(doc.ref);
    });

    console.log("Paul's test data cleaned successfully.");
  } catch (error) {
    console.error("Error cleaning Paul's tests:", error);
  }
};
