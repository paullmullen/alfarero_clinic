// src/pages/Registro/services/statsService.js
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import moment from "moment";

export async function updateStatsCollection(firestore, station) {
  const currentDate = moment();
  const currentMonth = currentDate.month() + 1;
  const currentYear = currentDate.year();
  const currentDay = currentDate.toDate().getDate();
  const currentMonthDayYear = `${currentMonth}/${currentDay}/${currentYear}`;

  const statsRef = doc(firestore, "stats", station);

  try {
    const statsDoc = await getDoc(statsRef);

    if (statsDoc.exists()) {
      const statsData = statsDoc.data();

      if (statsData.date !== currentMonthDayYear) {
        const statsCollectionRef = collection(firestore, "stats");
        const querySnapshot = await getDocs(statsCollectionRef);

        // reset all stations for the new day
        querySnapshot.forEach(async (docu) => {
          await updateDoc(docu.ref, {
            date: currentMonthDayYear,
            number_of_patients: 0,
            procedure_time_data: [],
            waiting_time_data: [],
            avg_procedure_time: 0,
            avg_waiting_time: 0,
          });
        });
      } else if (station === statsData.station_type) {
        const currentDayPatients = statsData.number_of_patients || 0;
        await updateDoc(statsRef, {
          number_of_patients: currentDayPatients + 1,
        });
      }
    } else {
      await setDoc(statsRef, {
        station_type: station,
        number_of_patients: 1,
        date: currentMonthDayYear,
      });
    }
  } catch (error) {
    console.log("Error updating stats collection:", error);
  }
}
