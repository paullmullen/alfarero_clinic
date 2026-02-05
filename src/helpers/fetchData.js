import { collection, getDocs } from "firebase/firestore";
import { fetchPatientsData } from "./fetchPatientsData";
import { firestore } from "../helpers/firebaseConfig";

export const fetchData = async ({
  dateRange,
  setData,
  setPatientsChanged,
  setStatsData,
  isMounted,
  locationId,
}) => {
  try {
    // Fetch patients data
    const initialData = await fetchPatientsData(
      dateRange,
      process.env.REACT_APP_FIREBASE_DB,
      "active",
      locationId,
    );
    if (isMounted) {
      setData(initialData);
    }
    setPatientsChanged(false);

    // Fetch stats data occasionally
    if (isMounted) {
      const statsRef = collection(firestore, "stats");
      const statsSnapshot = await getDocs(statsRef);
      const statsData = statsSnapshot.docs.map((doc) => doc.data());
      setStatsData(statsData);
    }
  } catch (error) {
    console.log(error);
  }
};
