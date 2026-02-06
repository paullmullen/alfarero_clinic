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
    // Treat "__ALL__" as no filter (backward-compatible)
    const locationFilterId = locationId === "__ALL__" ? null : locationId;

    // Fetch patients data
    const initialData = await fetchPatientsData(
      dateRange,
      process.env.REACT_APP_FIREBASE_DB,
      "active",
      locationFilterId,
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
