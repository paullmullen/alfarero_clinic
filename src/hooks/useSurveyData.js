import { useCallback } from "react";
import { fetchSurveyData } from "../helpers/fetchSurveyData";
import { surveySummary } from "../utils/surveySummary";

export function useSurveyData() {
  return useCallback(async (dateRange) => {
    const surveys = await fetchSurveyData(dateRange);
    return {
      surveys,
      satScore: surveySummary(surveys),
    };
  }, []);
}
