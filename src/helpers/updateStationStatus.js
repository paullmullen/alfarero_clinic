import { firestore } from "./../helpers/firebaseConfig";

export const handleStatusChange = async (value, hoveredRowKey, station) => {
  try {
    await firestore.runTransaction(async (transaction) => {
      const docPatientRef = firestore.collection("patients").doc(hoveredRowKey);
      const docStatsRef = firestore.collection("stats").doc(station);

      const [docPatient, docStats] = await Promise.all([
        transaction.get(docPatientRef),
        transaction.get(docStatsRef),
      ]);

      if (docPatient.exists) {
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
            } else if (value === "obs" && item.status !== "obs") {
              updatedItem.procedure_start = Math.floor(Date.now() / 1000);
            }

            if (value !== "waiting" && item.status === "waiting") {
              updatedItem.wait_end = Math.floor(Date.now() / 1000);
              updatedItem.waiting_time = Math.abs(
                updatedItem.wait_end - updatedItem.wait_start
              );
            } else if (value !== "in_process" && item.status === "in_process") {
              updatedItem.procedure_end = Math.floor(Date.now() / 1000);
              updatedItem.procedure_time = Math.abs(
                updatedItem.procedure_end - updatedItem.procedure_start
              );
            } else if (value !== "obs" && item.status === "obs") {
              updatedItem.procedure_end = Math.floor(Date.now() / 1000);
              updatedItem.procedure_time = Math.abs(
                updatedItem.procedure_end - updatedItem.procedure_start
              );
            }
            return updatedItem;
          }
          return item;
        });

        transaction.update(docPatientRef, {
          plan_of_care: updatedPlanOfCare,
        });

        if (docStats.exists) {
          const statsData = docStats.data();
          const updatedItem = updatedPlanOfCare.find(
            (item) => item.station === station
          );

          if (value === "waiting" && updatedItem.wait_start) {
            const waitDifference = Math.abs(updatedItem.waiting_time);
            transaction.update(docStatsRef, {
              waiting_time_data: [
                ...(statsData.waiting_time_data || []),
                waitDifference,
              ].filter((time) => !isNaN(time)),
            });
          }

          if (value === "in_process" && updatedItem.procedure_start) {
            const inProcessDifference = Math.abs(updatedItem.procedure_time);
            transaction.update(docStatsRef, {
              procedure_time_data: [
                ...(statsData.procedure_time_data || []),
                inProcessDifference,
              ].filter((time) => !isNaN(time)),
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

  if (docPatientRefFin) {
    try {
      const doc = await docPatientRefFin.get();

      await firestore.runTransaction(async (transaction) => {
        const doc = await transaction.get(docPatientRefFin);

        if (doc.exists) {
          await docPatientRefFin.update({
            complete: true,
          });
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

  history.push("/survey");
};

export const handleReadmitClick = async (patientID) => {
  const docPatientRefFin = firestore.collection("patients").doc(patientID);

  if (docPatientRefFin) {
    try {
      const doc = await docPatientRefFin.get();

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


export const cleanCompletedPatients = async () => {
  const toBeDeleted = firestore
    .collection("patients")
    .where("complete", "==", true);
  toBeDeleted.get().then(function (querySnapshot) {
    querySnapshot.forEach(function (doc) {
      doc.ref.delete();
    });
  });
};

export const cleanEmptySurveys = async () => {
  const toBeDeleted = firestore
    .collection("surveys")
    .where("satisfaction", "==", "")
    .where("suggestion", "==", "")
    .where("source", "==", "")
    .where("first", "==", "");
  toBeDeleted.get().then(function (querySnapshot) {
    querySnapshot.forEach(function (doc) {
      doc.ref.delete();
    });
  });
  console.log("cleaned surveys");
};
