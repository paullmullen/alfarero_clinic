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

export const handleStatusChange = async (value, hoveredRowKey, station) => {
  try {
    // Reference the Firestore document for the patient
    const patientRef = doc(firestore, "patients", hoveredRowKey);

    // Get the current patient document
    const patientDoc = await getDoc(patientRef);
    if (!patientDoc.exists) {
      console.error("Patient document does not exist.");
      return;
    }

    const patientData = patientDoc.data();

    // Ensure `plan_of_care` exists and is an array
    if (!Array.isArray(patientData.plan_of_care)) {
      console.error("plan_of_care is missing or not an array.");
      return;
    }

    // Find the index of the entry in `plan_of_care` that matches the station
    const carePlanIndex = patientData.plan_of_care.findIndex(
      (entry) => entry.station === station
    );

    if (carePlanIndex === -1) {
      console.error("No matching station found in plan_of_care.");
      return;
    }

    const updatedPlanOfCare = [...patientData.plan_of_care];
    const currentEntry = updatedPlanOfCare[carePlanIndex];

    // Initialize all the values we'll update
    let newWaitingStart = currentEntry.waiting_start;
    let newWaitingEnd = currentEntry.waiting_end;
    let newWaitingTime = currentEntry.waiting_time;
    let newInProcessStart = currentEntry.in_process_start;
    let newInProcessEnd = currentEntry.in_process_end;
    let newProcedureTime = currentEntry.procedure_time;

    // Handle changes related to "waiting" status
    if (value === "waiting" && currentEntry.status !== "waiting") {
      // If changing to "waiting", set new waiting_start and clear waiting_end, waiting_time
      console.log(
        "Status changed to 'waiting', setting waiting_start and clearing waiting_end and waiting_time."
      );
      newWaitingStart = new Date().toISOString();
      newWaitingEnd = null;
      newWaitingTime = null;
    } else if (currentEntry.status === "waiting" && value !== "waiting") {
      // If changing from "waiting", set new waiting_end and calculate waiting_time
      console.log(
        "Status changed from 'waiting' to something else, setting waiting_end and calculating waiting_time."
      );
      newWaitingEnd = new Date().toISOString();
      if (newWaitingStart) {
        const waitingStart = new Date(newWaitingStart).getTime();
        const waitingEnd = new Date(newWaitingEnd).getTime();
        newWaitingTime = (waitingEnd - waitingStart) / 1000; // in seconds
      }
    }

    // Handle changes related to "in_process" status
    if (value === "in_process" && currentEntry.status !== "in_process") {
      // If changing to "in_process", set new in_process_start and clear in_process_end, procedure_time
      console.log(
        "Status changed to 'in_process', setting in_process_start and clearing in_process_end and procedure_time."
      );
      newInProcessStart = new Date().toISOString();
      newInProcessEnd = null;
      newProcedureTime = null;
    } else if (currentEntry.status === "in_process" && value !== "in_process") {
      // If changing from "in_process", set new in_process_end and calculate procedure_time
      console.log(
        "Status changed from 'in_process' to something else, setting in_process_end and calculating procedure_time."
      );
      newInProcessEnd = new Date().toISOString();
      if (newInProcessStart) {
        const procedureStart = new Date(newInProcessStart).getTime();
        const procedureEnd = new Date(newInProcessEnd).getTime();
        newProcedureTime = (procedureEnd - procedureStart) / 1000; // in seconds
      }
    }

    // Handle status change to something other than "waiting" or "in_process"
    if (value !== "waiting" && value !== "in_process") {
      console.log(
        `Status changed from ${currentEntry.status} to ${value}, updating status.`
      );
    }

    // Perform one massive update
    updatedPlanOfCare[carePlanIndex] = {
      ...currentEntry,
      status: value,
      waiting_start: newWaitingStart,
      waiting_end: newWaitingEnd,
      waiting_time: newWaitingTime,
      in_process_start: newInProcessStart,
      in_process_end: newInProcessEnd,
      procedure_time: newProcedureTime,
      lastUpdate: new Date().toISOString(),
    };

    // Commit the updated array back to Firestore
    await updateDoc(patientRef, {
      plan_of_care: updatedPlanOfCare,
    });

    console.log("Patient document updated successfully.");
  } catch (error) {
    console.error("Error updating patient document:", error, value);
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
