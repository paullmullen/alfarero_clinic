import { useCallback } from "react";
import { fetchDaysAgoData } from "../helpers/fetchDaysAgo";
import { calculateRollingAverage } from "../utils/calculateRollingAverage";

/**
 * Loads N days of historical patient counts and optionally
 * computes the rolling average (15-day default window).
 *
 * Returns:
 *   {
 *     data: Array<{ date, count }>,
 *     rolling: Array<{ date, count, average }>
 *   }
 */
export function useDaysAgoData() {
  const loadDaysAgo = useCallback(async (days) => {
    // fetch raw historical data
    const data = await fetchDaysAgoData(
      process.env.REACT_APP_FIREBASE_DB,
      days
    );

    // rolling averages only available if dataset is large enough
    const rolling = data.length > 15 ? calculateRollingAverage(data) : [];

    return { data, rolling };
  }, []);

  return loadDaysAgo;
}
