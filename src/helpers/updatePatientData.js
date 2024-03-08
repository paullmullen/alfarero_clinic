import { firestore } from "./../helpers/firebaseConfig";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";

const updatePatientData = async (name, phone, reasonForVisit, hoveredRowKey) => {
  try {
    const patientRef = collection(firestore, "patients");
    console.log(hoveredRowKey);
    const q = query(patientRef, where("pt_no", "==", hoveredRowKey));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const patientDoc = querySnapshot.docs[0]; // Get the first document in the snapshot
      // Update the document with new data
      const patientDocRef = doc(patientRef, patientDoc.id); // Get reference to the document
      await updateDoc(patientDocRef, { patient_name: name, tel: phone, reason_for_visit: reasonForVisit  }); // Update the fields
    } else {
      console.log("No matching documents");
    }
  } catch (err) {
    console.log("error:", err.message);
  }
};

export { updatePatientData };






