import { firestore } from "./firebaseConfig";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";

const fetchDaysAgoData = async (daysCount) => {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - daysCount);

    const patientsCollection = collection(firestore, "patients");
    const q = query(patientsCollection, where("start_time", ">=", Timestamp.fromDate(daysAgo)));
    const patientsSnapshot = await getDocs(q);

    let patientCountHistogram = [];
  
    patientsSnapshot.forEach(doc => {
        const startTime = doc.data().start_time.toDate();
        const day = startTime.toISOString().split('T')[0].substring(5); // Extracting date in 'MM-DD' format
        let existingEntry = patientCountHistogram.find(entry => entry.date === day);
        if (existingEntry) {
            existingEntry.count++;
        } else {
            patientCountHistogram.push({ date: day, count: 1 });
        }
    });
    return patientCountHistogram;
};

export { fetchDaysAgoData };
