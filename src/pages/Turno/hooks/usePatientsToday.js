import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";

export function usePatientsToday({ firestore, dayWindow, locationFilterId }) {
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    const patientsRef = collection(firestore, "patients");

    const constraints = [
      where("last_update", ">=", dayWindow.todayTs),
      where("last_update", "<", dayWindow.tomorrowTs),
      where("complete", "==", false),
      orderBy("last_update", "asc"),
    ];

    if (locationFilterId) {
      constraints.unshift(where("location_id", "==", locationFilterId));
    }

    const q = query(patientsRef, ...constraints);

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map((doc) => {
          const d = doc.data() ?? {};
          const last = d.last_update?.toDate?.();
          const start_time = last ? last.toISOString() : null;

          return {
            ...d,
            start_time,
            pt_no: d.pt_no ?? doc.id,
          };
        });

        setPatients(next);
      },
      (err) => {
        console.error("Turno realtime listener error:", err);
        setPatients([]);
      },
    );

    return () => unsub();
  }, [firestore, locationFilterId, dayWindow.todayTs, dayWindow.tomorrowTs]);

  return patients;
}
