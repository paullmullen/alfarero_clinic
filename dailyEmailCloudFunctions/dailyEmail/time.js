// dailyEmail/time.js
"use strict";

/**
 * Time helpers for the clinic day.
 * NOTE: This keeps your existing behavior exactly (your "today" window is based on localDate - 1).
 */

function getLocalDayRangeTimestamps(Timestamp, timezoneOffsetMinutes) {
  const now = new Date();

  // Kept IDENTICAL to your existing logic:
  // startOfTodayLocal uses (today - 1)
  const startOfTodayLocal = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  );

  const startOfTodayUTC = new Date(
    startOfTodayLocal.getTime() + timezoneOffsetMinutes * 60 * 1000,
  );

  const startOfTomorrowLocal = new Date(startOfTodayLocal);
  startOfTomorrowLocal.setDate(startOfTomorrowLocal.getDate() + 1);

  const startOfTomorrowUTC = new Date(
    startOfTomorrowLocal.getTime() + timezoneOffsetMinutes * 60 * 1000,
  );

  return {
    startOfToday: Timestamp.fromDate(startOfTodayUTC),
    startOfTomorrow: Timestamp.fromDate(startOfTomorrowUTC),
  };
}

function getStartOf30DaysAgoTimestamp(Timestamp, timezoneOffsetMinutes) {
  const now = new Date();
  const startOf30DaysAgoLocal = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  startOf30DaysAgoLocal.setDate(startOf30DaysAgoLocal.getDate() - 30);

  const startOf30DaysAgoUTC = new Date(
    startOf30DaysAgoLocal.getTime() + timezoneOffsetMinutes * 60 * 1000,
  );

  return Timestamp.fromDate(startOf30DaysAgoUTC);
}

function getClinicYMD(timezoneOffsetMinutes) {
  return new Date(Date.now() - timezoneOffsetMinutes * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

module.exports = {
  getLocalDayRangeTimestamps,
  getStartOf30DaysAgoTimestamp,
  getClinicYMD,
};
