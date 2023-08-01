import { firestore } from "./../helpers/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

import { midnightToday } from "./midnightToday";



const fetchPatientsData = async () => {
    const patientsData = [];
    const patientsCollection = collection(firestore, "patients");
    const patientsSnapshot = await getDocs(patientsCollection);
  
    patientsSnapshot.forEach((doc) => {
      const {
        pt_no,
        patient_name,
        start_time,
        reason_for_visit,
        type_of_visit,
        plan_of_care,
      } = doc.data();
      const dataEntry = {
        pt_no,
        patient_name,
        start_time,
        reason_for_visit,
        type_of_visit,
        plan_of_care,
      };
      let patientPoc = [];
      dataEntry.plan_of_care.forEach((poc) => {
        if (poc.status === "complete") {
          patientPoc.push(poc.station);
        }
      });
      const pocString = patientPoc.join(", ");
  
      if (dataEntry.start_time.toDate() >= midnightToday) {
        patientsData.push({
          pt_no: dataEntry.pt_no,
          patient_name: dataEntry.patient_name,
          start_time:
            dataEntry.start_time.toDate().getHours().toString().padStart(2, "0") +
            ":" +
            dataEntry.start_time
              .toDate()
              .getMinutes()
              .toString()
              .padStart(2, "0"),
          reason_for_visit: dataEntry.reason_for_visit,
          type_of_visit: dataEntry.type_of_visit,
          plan_of_care: pocString,
        });
      }
    });
    return patientsData;
  };

  export { fetchPatientsData };