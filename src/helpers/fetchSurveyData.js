import { firestore } from "./../helpers/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

const fetchSurveyData = async (dateRange) => {
  const surveyData = [];
  const surveyCollection = collection(firestore, "surveys");
  const surveySnapshot = await getDocs(surveyCollection)
  const midnightToday = new Date().setHours(0, 0, 0, 0);

  const surveyEntries = surveySnapshot.docs.map((doc, counter) => {
    const { date, first, satisfaction, suggestion, source } = doc.data();
    const dataEntry = {
      date,
      first,
      satisfaction,
      suggestion,
      source,
    };

    if ((dataEntry.date.toMillis() >= dateRange[0]) && (dataEntry.date.toMillis() <= dateRange[1])) {
      return {
        inx: counter,
        first: dataEntry.first,
        source: dataEntry.source,
        suggestion: dataEntry.suggestion,
        satisfaction: satisfaction,
      };
    } else {
      return null; // Return null for entries that are not for today
    }
  });
  // Filter out the null entries and only keep the valid ones
  surveyData.push(...surveyEntries.filter((entry) => (entry !== null) ));

  return surveyData;
};

export { fetchSurveyData };
