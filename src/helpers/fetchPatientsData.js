import { getFirestore, collection, getDocs } from "firebase/firestore";

const fetchPatientsData = async (dateRange) => {
  const db = getFirestore(); // Initialize Firestore
  const patientsData = [];
  const patientsCollection = collection(db, "patients");
  const patientsSnapshot = await getDocs(patientsCollection);

  patientsSnapshot.forEach((doc) => {
    const {
      pt_no,
      patient_name,
      start_time,
      reason_for_visit,
      type_of_visit,
      plan_of_care,
      complete,
      gender,
      age_group,
    } = doc.data();

    let patientPoc = [];
    let totalWait = 0;

    // Process plan_of_care
    plan_of_care.forEach((poc) => {
      if (poc.status === "complete") {
        patientPoc.push(poc.station);
      }
      if (poc.waiting_time) {
        totalWait += poc.waiting_time;
      }
    });

    const pocString = patientPoc.join(", ");

    // Filter data within the specified date range
    if (
      start_time.toMillis() >= dateRange[0] &&
      start_time.toMillis() <= dateRange[1]
    ) {
      patientsData.push({
        pt_no,
        patient_name,
        date: start_time.toDate().toLocaleDateString("en-US"), // Simplify date formatting
        start_time: start_time
          .toDate()
          .toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        reason_for_visit,
        type_of_visit,
        plan_of_care: pocString,
        total_wait: Math.round(totalWait / 60), // Convert seconds to minutes
        complete,
        gender,
        age_group,
      });
    }
  });

  return patientsData;
};

export { fetchPatientsData };
