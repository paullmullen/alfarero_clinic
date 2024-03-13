import { firestore } from "./firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

const fetchWaitingTimeData = async () => {    //note that the dateRange is really not functional now because the waiting data is always the current day
  const statsCollection = collection(firestore, "stats");

  
  const statsSnapshot = await getDocs(statsCollection)
  const statsReturn = [];
  const statsData = statsSnapshot.docs.map((doc, counter) => {
    const { avg_procedure_time, avg_waiting_time, date, number_of_patients, station_type } = doc.data();
    const dataEntry = {
      date,
      avg_procedure_time,
      avg_waiting_time,
      number_of_patients,
      station_type,
    };
      return {
        inx: counter,
        date: dataEntry.date,
        avg_waiting_time: Math.round(dataEntry.avg_waiting_time/60),
        avg_procedure_time: Math.round(dataEntry.avg_procedure_time/60),
        number_of_patients: dataEntry.number_of_patients,
        station_type: dataEntry.station_type
      };

  });
  // Filter out the null entries and only keep the valid ones
  statsReturn.push(...statsData.filter((entry) => (entry !== null) ));
  return statsReturn;
};

export { fetchWaitingTimeData };
