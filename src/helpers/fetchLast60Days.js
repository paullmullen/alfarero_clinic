import { firestore } from "./firebaseConfig";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";


const sixtyDaysAgo = new Date();
sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60); // Set time to the beginning of the next day

const fetchLast60Days = async () => {
    const patientsCollection = collection(firestore, "patients");
    const q = query(patientsCollection, where("start_time", ">=", Timestamp.fromDate(sixtyDaysAgo)));
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

export { fetchLast60Days };
