import { firestore } from "../helpers/firebaseConfig";
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
  hoveredRowKey,
  national_id_number, // number (int) or null
  extra = {}, // 👈 NEW: optional fields (guardian_name, etc.)
) => {
  console.log(
    name,
    phone,
    reasonForVisit,
    hoveredRowKey,
    national_id_number,
    extra,
  );

  try {
    const patientRef = collection(firestore, "patients");
    const q = query(patientRef, where("pt_no", "==", hoveredRowKey));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const patientDoc = querySnapshot.docs[0];
      const patientDocRef = doc(firestore, "patients", patientDoc.id);

      await updateDoc(patientDocRef, {
        patient_name: name,
        tel: phone,
        reason_for_visit: reasonForVisit,
        national_id_number: national_id_number ?? null,

        // 👇 NEW: spread additional fields safely
        ...extra,
      });

      console.log("Patient data updated successfully!");
    } else {
      console.log("No matching documents found.");
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
};

export { updatePatientData };
