import { firestore } from "./../helpers/firebaseConfig";

export const handleStatusChange = async (value, hoveredRowKey, station) => {
  const docPatientRef = firestore.collection("patients").doc(hoveredRowKey);

  if (docPatientRef) {
    try {
      const doc = await docPatientRef.get();

      if (doc.exists) {
        const data = doc.data();
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
            } else if (value !== "waiting" && item.status === "waiting") {
              updatedItem.wait_end = Math.floor(Date.now() / 1000);
              updatedItem.waiting_time = Math.abs(
                updatedItem.wait_end - updatedItem.wait_start
              );
            } else if (value !== "in_process" && item.status === "in_process") {
              updatedItem.procedure_end = Math.floor(Date.now() / 1000);
              updatedItem.procedure_time = Math.abs(
                updatedItem.procedure_end - updatedItem.procedure_start
              );
            }

            return updatedItem;
          }

          return item;
        });

        await docPatientRef.update({
          plan_of_care: updatedPlanOfCare,
        });

        const statsDocRef = firestore.collection("stats").doc(station);
        const statsDoc = await statsDocRef.get();

        if (statsDoc.exists) {
          const statsData = statsDoc.data();
          const updatedItem = updatedPlanOfCare.find(
            (item) => item.station === station
          );

          if (
            value === "waiting" &&
            updatedItem.wait_start
          ) {
            const waitDifference = Math.abs(updatedItem.waiting_time);
            await statsDocRef.update({
              waiting_time_data: [
                ...(statsData.waiting_time_data || []),
                waitDifference,
              ].filter((time) => !isNaN(time)),
            });
          }

          if (
            value === "in_process" &&
            updatedItem.procedure_start
          ) {
            const inProcessDifference = Math.abs(updatedItem.procedure_time);
            await statsDocRef.update({
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
            await statsDocRef.update({
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
            await statsDocRef.update({
              avg_procedure_time: procedureAverage,
            });

            if (value === "in_process" || value === "waiting" ) {
              await firestore
                .collection("patients")
                .doc(hoveredRowKey)
                .update({
                  avg_time: Math.floor(Date.now() / 1000)
                });
            }
          }
        }
      } else {
        console.log("No such document!");
      }
    } catch (error) {
      console.log("Error getting document:", error);
    }
  }
};

export const handleDelete = async (hoveredRowKey) => {

  const docPatientRefFin = firestore.collection("patients").doc(hoveredRowKey);

  if (docPatientRefFin) {
    try {
      const doc = await docPatientRefFin.get();

      if (doc.exists) {
        await docPatientRefFin.update({
          complete: true,
        });
      } else {
        console.log("No such document!");
      }
    } catch (error) {
      console.log("Error getting document:", error);
    }
  } else {
    console.log("No such document!");
  }
};


export const cleanCompletedPatients = async () => {
  const toBeDeleted = firestore.collection("patients").where("complete", "==", true);
  toBeDeleted.get().then (function(querySnapshot) {
    querySnapshot.forEach(function(doc) {
      doc.ref.delete();
    })
  });

  }

