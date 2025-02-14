import { collection, getDocs, query } from "firebase/firestore";
import { firestore } from "./firebaseConfig";

const fetchWaitingTimeData = async () => {
  try {
    // Ensure dateRange values are Firestore Timestamps

    const statsQuery = query(collection(firestore, "stats"));
    const querySnapshot = await getDocs(statsQuery);

    const statsData = querySnapshot.docs.map((doc, counter) => {
      const {
        avg_procedure_time,
        avg_waiting_time,
        number_of_patients,
        station_type,
      } = doc.data();

      return {
        inx: counter,
        avg_waiting_time: Math.round(avg_waiting_time / 60), // Convert to minutes
        avg_procedure_time: Math.round(avg_procedure_time / 60), // Convert to minutes
        number_of_patients,
        station_type,
      };
    });
    return statsData;
  } catch (error) {
    console.error("Error fetching waiting time data:", error);
    return [];
  }
};

export { fetchWaitingTimeData };
