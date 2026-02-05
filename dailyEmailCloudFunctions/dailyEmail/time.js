// dailyEmail/time.js
"use strict";

/**
 * Time helpers for clinic-local day boundaries.
 * This avoids server-timezone bugs by deriving the YYYY-MM-DD in a real IANA timezone,
 * then converting clinic-midnight to UTC using the offset.
 *
 * Assumptions:
 * - Clinic timezone is UTC-6 (Guatemala) and does not observe DST.
 * - Schedule is set to America/Guatemala already.
 */

const CLINIC_TIMEZONE = "America/Guatemala";
const TIMEZONE_OFFSET_MINUTES = 6 * 60; // UTC-6

function getClinicYMD(timeZone = CLINIC_TIMEZONE) {
  // "en-CA" yields YYYY-MM-DD ordering
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;

  return `${y}-${m}-${d}`; // YYYY-MM-DD
}

function getLocalDayRangeTimestamps(Timestamp) {
  const clinicYMD = getClinicYMD(CLINIC_TIMEZONE);
  const [y, m, d] = clinicYMD.split("-").map(Number);

  // Clinic midnight (UTC-6) expressed in UTC = UTC midnight + 6 hours
  const startUtc = new Date(
    Date.UTC(y, m - 1, d, 0, 0, 0) + TIMEZONE_OFFSET_MINUTES * 60 * 1000,
  );
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);

  return {
    startOfToday: Timestamp.fromDate(startUtc),
    startOfTomorrow: Timestamp.fromDate(endUtc),
  };
}

function getStartOf30DaysAgoTimestamp(Timestamp) {
  const clinicYMD = getClinicYMD(CLINIC_TIMEZONE);
  const [y, m, d] = clinicYMD.split("-").map(Number);

  const startTodayUtc = new Date(
    Date.UTC(y, m - 1, d, 0, 0, 0) + TIMEZONE_OFFSET_MINUTES * 60 * 1000,
  );
  const start30DaysAgoUtc = new Date(
    startTodayUtc.getTime() - 30 * 24 * 60 * 60 * 1000,
  );

  return Timestamp.fromDate(start30DaysAgoUtc);
}

module.exports = {
  CLINIC_TIMEZONE,
  TIMEZONE_OFFSET_MINUTES,
  getClinicYMD,
  getLocalDayRangeTimestamps,
  getStartOf30DaysAgoTimestamp,
};
