
import { useCallback } from "react";
import { firestore } from "../helpers/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

export function useStationsData() {
  const loadStations = useCallback(async () => {
    const snap = await getDocs(collection(firestore, "stats"));
    return snap.docs.map((doc) => doc.data());
  }, []);

  return loadStations;
}
