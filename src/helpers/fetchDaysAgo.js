import { firestore } from "./firebaseConfig";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";

const fetchDaysAgoData = async (daysCount) => {
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - daysCount);

  const patientsCollection = collection(firestore, "patients");
  const q = query(
    patientsCollection,
    where("start_time", ">=", Timestamp.fromDate(daysAgo))
  );
  const patientsSnapshot = await getDocs(q);

  // Map snapshot to a histogram
  const patientCountHistogram = patientsSnapshot.docs.reduce(
    (histogram, doc) => {
      const startTime = doc.data().start_time.toDate();
      const day = startTime.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
      }); // Format as MM-DD

      const existingEntry = histogram.find((entry) => entry.date === day);
      if (existingEntry) {
        existingEntry.count++;
      } else {
        histogram.push({ date: day, count: 1 });
      }
      return histogram;
    },
    []
  );

  // Sort histogram by date
  patientCountHistogram.sort(
    (a, b) => new Date(`2023-${a.date}`) - new Date(`2023-${b.date}`)
  );

  return patientCountHistogram;
};

export { fetchDaysAgoData };
