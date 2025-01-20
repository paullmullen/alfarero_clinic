import { collection, getDocs } from "firebase/firestore";
import { firestore } from "./firebaseConfig";

const fetchWaitingTimeData = async () => {
  try {
    const statsCollection = collection(firestore, "stats");
    const statsSnapshot = await getDocs(statsCollection);
    const statsReturn = [];

    const statsData = statsSnapshot.docs.map((doc, counter) => {
      const {
        avg_procedure_time,
        avg_waiting_time,
        date,
        number_of_patients,
        station_type,
      } = doc.data();

      if (
        avg_procedure_time !== undefined &&
        avg_waiting_time !== undefined &&
        number_of_patients !== undefined
      ) {
        return {
          inx: counter,
          date: date?.toDate?.(), // Convert Firestore timestamp to Date object if applicable
          avg_waiting_time: Math.round(avg_waiting_time / 60), // Convert to minutes
          avg_procedure_time: Math.round(avg_procedure_time / 60), // Convert to minutes
          number_of_patients,
          station_type,
        };
      }
      return null; // Filter out entries with invalid or missing data
    });

    // Filter out null entries and return valid ones
    statsReturn.push(...statsData.filter((entry) => entry !== null));
    return statsReturn;
  } catch (error) {
    console.error("Error fetching waiting time data:", error);
    return [];
  }
};

export { fetchWaitingTimeData };
