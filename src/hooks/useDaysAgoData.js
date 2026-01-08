// src/hooks/useDaysAgoData.js
import { useCallback } from "react";
import { fetchDaysAgoData } from "../helpers/fetchDaysAgo";
import { calculateRollingAverage } from "../utils/calculateRollingAverage";

/**
 * Loads N days of historical patient counts and computes a rolling average
 * using the provided window (default 15).
 *
 * Returns:
 *   {
 *     data: Array<{ date, count }>,
 *     rolling: Array<{ date, count, average }>
 *   }
 */
export function useDaysAgoData() {
  const loadDaysAgo = useCallback(async (days, rollingWindow = 15) => {
    const data = await fetchDaysAgoData(
      process.env.REACT_APP_FIREBASE_DB,
      days
    );

    // Compute rolling regardless of length; let the helper handle partial windows.
    const rolling =
      Array.isArray(data) && data.length > 0
        ? calculateRollingAverage(data, rollingWindow)
        : [];

    return { data, rolling };
  }, []);

  return loadDaysAgo;
}
