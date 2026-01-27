import { useEffect, useState } from "react";
import { firestore } from "../../../helpers/firebaseConfig";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { useTranslation } from "react-i18next";

export const useStations = () => {
  const [t] = useTranslation("global");
  const [stations, setStations] = useState([]);

  // Load stations on mount
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const ref = collection(firestore, "stats");
        const snap = await getDocs(ref);
        const items = snap.docs.map((d) => ({
          id: d.id,
          name: t(d.id),
          max_waiting_time: d.data().max_waiting_time ?? 0,
          ...d.data(),
        }));
        setStations(items);
      } catch (e) {
        console.error("Error fetching stations:", e);
      }
    };

    fetchStations();
  }, [t]);

  const updateMaxWait = async (stationId, value) => {
    try {
      const ref = doc(firestore, "stats", stationId);
      await updateDoc(ref, { max_waiting_time: value });

      setStations((prev) =>
        prev.map((s) =>
          s.id === stationId ? { ...s, max_waiting_time: value } : s,
        ),
      );
    } catch (e) {
      console.error("Error updating max_waiting_time:", e);
    }
  };

  return {
    stations,
    updateMaxWait,
  };
};
