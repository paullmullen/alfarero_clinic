import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { firestore } from "../helpers/firebaseConfig";

const fetchSurveyData = async (dateRange) => {
  try {
    if (!dateRange || dateRange.length !== 2) {
      const docRef = doc(firestore, "run_aggregation", "timestamp");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        dateRange = [data.range_start, data.range_end];
      } else {
        console.log("No date range in stats collection.!");
      }
    }

    // Ensure dateRange values are Firestore Timestamps
    const startTimestamp =
      dateRange[0] instanceof Timestamp
        ? dateRange[0]
        : Timestamp.fromMillis(dateRange[0]); // Converts ms to Firestore Timestamp

    const endTimestamp =
      dateRange[1] instanceof Timestamp
        ? dateRange[1]
        : Timestamp.fromMillis(dateRange[1]); // Converts ms to Firestore Timestamp

    // Firestore Query
    const surveyQuery = query(
      collection(firestore, "surveys"),
      where("date", ">=", startTimestamp),
      where("date", "<=", endTimestamp)
    );

    const querySnapshot = await getDocs(surveyQuery);

    const surveyData = querySnapshot.docs.map((doc, index) => {
      const {
        date,
        first,
        satisfaction,
        suggestion,
        source,
        prayer_request,
        age_group,
        gender,
      } = doc.data();

      return {
        date: date,
        inx: index,
        first,
        source,
        suggestion,
        satisfaction,
        prayer_request,
        age_group,
        gender,
      };
    });

    return surveyData;
  } catch (error) {
    console.error("Error fetching survey data:", error);
    return [];
  }
};

export { fetchSurveyData };
