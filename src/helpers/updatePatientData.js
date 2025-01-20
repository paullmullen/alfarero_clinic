import { firestore } from "../helpers/firebaseConfig"; // import your Firestore instance
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";

const updatePatientData = async (
  name,
  phone,
  reasonForVisit,
  hoveredRowKey
) => {
  console.log(name, phone, reasonForVisit, hoveredRowKey);

  try {
    const patientRef = collection(firestore, "patients"); // Use 'db' instead of 'firestore'
    const q = query(patientRef, where("pt_no", "==", hoveredRowKey)); // Create query
    const querySnapshot = await getDocs(q); // Fetch documents based on query

    if (!querySnapshot.empty) {
      const patientDoc = querySnapshot.docs[0]; // Get the first matching document
      const patientDocRef = doc(firestore, "patients", patientDoc.id); // Get document reference
      await updateDoc(patientDocRef, {
        patient_name: name,
        tel: phone,
        reason_for_visit: reasonForVisit,
      }); // Update the fields with the new data
      console.log("Patient data updated successfully!");
    } else {
      console.log("No matching documents found.");
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
};

export { updatePatientData };
