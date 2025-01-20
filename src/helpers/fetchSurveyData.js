import { collection, getDocs } from "firebase/firestore";
import { firestore } from "./../helpers/firebaseConfig";

const fetchSurveyData = async (dateRange) => {
  try {
    const surveyData = [];
    const surveyCollection = collection(firestore, "surveys");
    const surveySnapshot = await getDocs(surveyCollection);

    const surveyEntries = surveySnapshot.docs.map((doc, counter) => {
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

      // Check if the date is within the provided range
      if (
        date?.toMillis &&
        date.toMillis() >= dateRange[0] &&
        date.toMillis() <= dateRange[1]
      ) {
        return {
          inx: counter,
          first,
          source,
          suggestion,
          satisfaction,
          prayer_request,
          age_group,
          gender,
        };
      }

      return null; // Filter out entries outside the date range
    });

    // Filter out null entries and add valid ones to surveyData
    surveyData.push(...surveyEntries.filter((entry) => entry !== null));

    return surveyData;
  } catch (error) {
    console.error("Error fetching survey data:", error);
    return [];
  }
};

export { fetchSurveyData };
