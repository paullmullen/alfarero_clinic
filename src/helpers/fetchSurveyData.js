import { firestore } from "./../helpers/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

const fetchSurveyData = async (dateRange) => {
  const surveyData = [];
  const surveyCollection = collection(firestore, "surveys");
  const surveySnapshot = await getDocs(surveyCollection)

  const surveyEntries = surveySnapshot.docs.map((doc, counter) => {
    const { date, first, satisfaction, suggestion, source, prayer_request, age_group, gender } = doc.data();
    const dataEntry = {
      date,
      first,
      satisfaction,
      suggestion,
      source,
      prayer_request,
      age_group,
      gender
    };

    if ((dataEntry.date.toMillis() >= dateRange[0]) && (dataEntry.date.toMillis() <= dateRange[1])) {
      return {
        inx: counter,
        first: dataEntry.first,
        source: dataEntry.source,
        suggestion: dataEntry.suggestion,
        satisfaction: satisfaction,
        prayer_request: dataEntry.prayer_request,
        age_group: age_group,
        gender: gender
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
