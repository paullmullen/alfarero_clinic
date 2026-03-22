// dailyEmail/time.js

/**
 * Time helpers for clinic-local day boundaries.
 * This avoids server-timezone bugs by deriving the YYYY-MM-DD in a real IANA timezone,
 * then converting clinic-midnight to UTC using the offset.
 *
 * Assumptions:
 * - Clinic timezone is UTC-6 (Guatemala) and does not observe DST.
 * - Schedule is set to America/Guatemala already.
 *
 * DEBUG SUPPORT:
 * - shiftDays lets the caller ask for "the report as of N days ago".
 * - shiftDays = 0 means normal behavior ("today").
 * - shiftDays = 3 means "pretend today's clinic date is 3 days earlier".
 */

const CLINIC_TIMEZONE = "America/Guatemala";
const TIMEZONE_OFFSET_MINUTES = 6 * 60; // UTC-6

function getShiftedBaseDate(shiftDays = 0) {
  const safeShiftDays = Number.isInteger(shiftDays) ? shiftDays : 0;
  const now = new Date();

  if (safeShiftDays === 0) return now;

  const shifted = new Date(now);
  shifted.setUTCDate(shifted.getUTCDate() - safeShiftDays);
  return shifted;
}

function getClinicYMD(timeZone = CLINIC_TIMEZONE, shiftDays = 0) {
  // "en-CA" yields YYYY-MM-DD ordering
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(getShiftedBaseDate(shiftDays));

  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;

  return `${y}-${m}-${d}`; // YYYY-MM-DD
}

function getLocalDayRangeTimestamps(Timestamp, { shiftDays = 0 } = {}) {
  const clinicYMD = getClinicYMD(CLINIC_TIMEZONE, shiftDays);
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

function getStartOf30DaysAgoTimestamp(Timestamp, { shiftDays = 0 } = {}) {
  const { startOfToday } = getLocalDayRangeTimestamps(Timestamp, { shiftDays });

  const start30DaysAgoUtc = new Date(
    startOfToday.toDate().getTime() - 30 * 24 * 60 * 60 * 1000,
  );

  return Timestamp.fromDate(start30DaysAgoUtc);
}

export {
  CLINIC_TIMEZONE,
  TIMEZONE_OFFSET_MINUTES,
  getClinicYMD,
  getLocalDayRangeTimestamps,
  getStartOf30DaysAgoTimestamp,
};
