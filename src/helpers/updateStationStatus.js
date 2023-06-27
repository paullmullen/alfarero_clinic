import { firestore } from "./../helpers/firebaseConfig";

export const handleStatusChange = async (value, hoveredRowKey, station) => {
  const docPatientRef = firestore.collection("patients").doc(hoveredRowKey);

  if (docPatientRef) {
    docPatientRef
      .get()
      .then((doc) => {
        if (doc.exists) {
          const data = doc.data();
          const updatedPlanOfCare = data.plan_of_care?.map((item) => {
            if (item.station === station) {
              return {
                ...item,
                status: value,
              };
            }
            return item;
          });

          docPatientRef.update({
            plan_of_care: updatedPlanOfCare,
          });
        } else {
          console.log("No such document!");
        }
      })
      .catch((error) => {
        console.log("Error getting document:", error);
      });
  } 
};

export const handleDelete = async (hoveredRowKey) => {
  const docPatientRefFin = firestore.collection("patients").doc(hoveredRowKey);

  if (docPatientRefFin) {
    docPatientRefFin
      .get()
      .then((doc) => {
        if (doc.exists) {
          docPatientRefFin.update({
            complete: true
          });
        } else {
          console.log("No such document!");
        }
      })
      .catch((error) => {
        console.log("Error getting document:", error);
      });
  } 
};
