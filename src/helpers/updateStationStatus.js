import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  runTransaction,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { firestore } from "./../helpers/firebaseConfig";

export const handleStatusChange = async (value, hoveredRowKey, station) => {
  try {
    await runTransaction(firestore, async (transaction) => {
      const docPatientRef = doc(firestore, "patients", hoveredRowKey);

      const docStatsRef = doc(firestore, "stats", station);

      const [docPatient, docStats] = await Promise.all([
        transaction.get(docPatientRef),
        transaction.get(docStatsRef),
      ]);

      let endOfWait = false;
      let endOfProcess = false;

      if (docPatient.exists()) {
        const data = docPatient.data();
        const updatedPlanOfCare = data.plan_of_care?.map((item) => {
          if (item.station === station) {
            const updatedItem = {
              ...item,
              status: value,
            };

            if (value === "waiting" && item.status !== "waiting") {
              updatedItem.wait_start = Math.floor(Date.now() / 1000);
            } else if (value === "in_process" && item.status !== "in_process") {
              updatedItem.procedure_start = Math.floor(Date.now() / 1000);
            }

            if (value !== "waiting" && item.status === "waiting") {
              updatedItem.wait_end = Math.floor(Date.now() / 1000);
              updatedItem.waiting_time = Math.abs(
                updatedItem.wait_end - updatedItem.wait_start
              );
              endOfWait = true;
            } else if (value !== "in_process" && item.status === "in_process") {
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

        transaction.update(docPatientRef, { plan_of_care: updatedPlanOfCare });

        if (docStats.exists()) {
          const statsData = docStats.data();
          const updatedItem = updatedPlanOfCare.find(
            (item) => item.station === station
          );

          if (endOfWait) {
            const waitDifference = Math.abs(updatedItem.waiting_time);
            transaction.update(docStatsRef, {
              waiting_time_data: [
                ...(statsData.waiting_time_data || []),
                waitDifference,
              ],
            });
          }

          if (endOfProcess) {
            const inProcessDifference = Math.abs(updatedItem.procedure_time);
            transaction.update(docStatsRef, {
              procedure_time_data: [
                ...(statsData.procedure_time_data || []),
                inProcessDifference,
              ],
            });
          }

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
          }
        }
      } else {
        console.log("No such document!");
      }
    });
  } catch (error) {
    console.error("Error updating status:", error);
  }
};

export const handleDelete = async (hoveredRowKey, history) => {
  try {
    const docPatientRef = doc(firestore, "patients", hoveredRowKey);

    await updateDoc(docPatientRef, {
      complete: true,
    });

    const docSnapshot = await getDoc(docPatientRef);
    const patData = docSnapshot.exists() ? docSnapshot.data() : {};

    const result = {
      age_group: patData.age_group,
      gender: patData.gender,
    };

    history.push({ pathname: "/survey", state: result });
  } catch (error) {
    console.error("Error deleting patient:", error);
  }
};

export const handleReadmitClick = async (patientID) => {
  try {
    const docPatientRef = doc(firestore, "patients", patientID);

    await updateDoc(docPatientRef, {
      complete: false,
    });
  } catch (error) {
    console.error("Error readmitting patient:", error);
  }
};

export const cleanPaulTests = async () => {
  try {
    const patientsRef = collection(firestore, "patients");
    const q = query(patientsRef, where("patient_name", "==", "Paul"));

    const querySnapshot = await getDocs(q);

    for (const doc of querySnapshot.docs) {
      await deleteDoc(doc.ref);
    }

    console.log("Paul's test data cleaned successfully.");
  } catch (error) {
    console.error("Error cleaning Paul's tests:", error);
  }
};
