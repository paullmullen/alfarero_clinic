import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { firestore } from "./../helpers/firebaseConfig";

const updatePatientData = async (
  name,
  phone,
  reasonForVisit,
  hoveredRowKey
) => {
  console.log(name, phone, reasonForVisit, hoveredRowKey);

  try {
    const patientRef = collection(firestore, "patients");
    const q = query(patientRef, where("pt_no", "==", hoveredRowKey));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const patientDoc = querySnapshot.docs[0]; // Get the first document in the snapshot
      const patientDocRef = doc(firestore, "patients", patientDoc.id); // Get a reference to the document
      await updateDoc(patientDocRef, {
        patient_name: name,
        tel: phone,
        reason_for_visit: reasonForVisit,
      }); // Update the fields
    } else {
      console.log("No matching documents");
    }
  } catch (err) {
    console.log("Error:", err.message);
  }
};

export { updatePatientData };
