import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { firestore } from "./../helpers/firebaseConfig";

import axios from "axios";

export const handleStatusChange = async (value, hoveredRowKey, station) => {
  try {
    // Getting the database name from the environment variable
    const databaseName = process.env.REACT_APP_FIREBASE_DB;

    // Calling the cloud function with the required parameters
    const response = await axios.post(
      "https://us-central1-alfarero-478ad.cloudfunctions.net/updateStatusChange",
      {
        patientId: hoveredRowKey,
        carePlanIndex: station,
        newStatus: value,
        databaseName: databaseName,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Function response:", response.data);
    return response.data; // Optionally return the result
  } catch (error) {
    console.error("Error calling the cloud function:", error);
    throw error; // Optionally rethrow the error if you want to handle it elsewhere
  }
};

export const handleDelete = async (hoveredRowKey, history) => {
  try {
    const docPatientRef = doc(firestore, "patients", hoveredRowKey);

    // Update the patient document to mark it as complete
    await updateDoc(docPatientRef, {
      complete: true,
    });

    // Fetch the patient data after marking as complete
    const docSnapshot = await getDoc(docPatientRef);
    const patData = docSnapshot.exists() ? docSnapshot.data() : {};

    const result = {
      age_group: patData.age_group,
      gender: patData.gender,
    };

    // Redirect to the survey page with patient details
    history.push({ pathname: "/survey", state: result });
  } catch (error) {
    console.error("Error deleting patient:", error);
  }
};

export const handleReadmitClick = async (patientID) => {
  try {
    // Reference the patient document
    const docPatientRef = doc(firestore, "patients", patientID);

    // Update the `complete` field to `false`
    await updateDoc(docPatientRef, {
      complete: false,
    });

    console.log(`Patient ${patientID} readmitted successfully.`);
  } catch (error) {
    console.error("Error readmitting patient:", error);
  }
};

export const cleanPaulTests = async () => {
  try {
    // Reference the "patients" collection
    const patientsRef = collection(firestore, "patients");

    // Create a query to find patients with `patient_name` equal to "Paul"
    const q = query(patientsRef, where("patient_name", "==", "Paul"));

    // Execute the query and get matching documents
    const querySnapshot = await getDocs(q);

    // Delete each document that matches the query
    for (const patientDoc of querySnapshot.docs) {
      await deleteDoc(patientDoc.ref);
    }

    console.log("Paul's test data cleaned successfully.");
  } catch (error) {
    console.error("Error cleaning Paul's tests:", error);
  }
};
