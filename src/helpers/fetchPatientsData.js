import { firestore } from "./../helpers/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";


const fetchPatientsData = async (dateRange) => {
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
        complete,
      } = doc.data();
      const dataEntry = {
        pt_no,
        patient_name,
        start_time,
        reason_for_visit,
        type_of_visit,
        plan_of_care,
        complete
      };
      let patientPoc = [];
      let totalWait = 0;
      dataEntry.plan_of_care.forEach((poc) => {
        if (poc.status === "complete") {
          patientPoc.push(poc.station);
        }
        if (poc.waiting_time) {totalWait += poc.waiting_time}
      });
      const pocString = patientPoc.join(", ");
  
      if ((dataEntry.start_time.toMillis() >= dateRange[0]) && (dataEntry.start_time.toMillis() <= dateRange[1])) {
        patientsData.push({
          pt_no: dataEntry.pt_no,
          patient_name: dataEntry.patient_name,
          date: (dataEntry.start_time.toDate().getMonth()+1).toString()+"/"+dataEntry.start_time.toDate().getDate().toString()+"/"+dataEntry.start_time.toDate().getFullYear().toString(),
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
          total_wait: Math.round(totalWait/60,0),
          complete: dataEntry.complete,
        });
      }
    });
    return patientsData;
  };

  export { fetchPatientsData };