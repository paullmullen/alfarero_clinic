import { Timestamp } from "firebase/firestore";

/**
 * Returns Firestore Timestamps for today and tomorrow at 00:00:00.
 * @returns {Object} An object with todayTimestamp and tomorrowTimestamp.
 */
export const getTodayAndTomorrowTimestamps = () => {
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0
  );

  return {
    todayTimestamp: Timestamp.fromDate(today),
    tomorrowTimestamp: Timestamp.fromDate(tomorrow),
  };
};
