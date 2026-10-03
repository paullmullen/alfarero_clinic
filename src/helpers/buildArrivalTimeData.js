const CLINIC_TIMEZONE = "America/Guatemala";

function arrivalDate(value) {
  if (value == null || value === "") return null;
  let date;
  if (value instanceof Date) date = value;
  else if (typeof value?.toDate === "function") date = value.toDate();
  else if (typeof (value?.seconds ?? value?._seconds) === "number") {
    const seconds = value.seconds ?? value._seconds;
    const nanoseconds = value.nanoseconds ?? value._nanoseconds ?? 0;
    date = new Date(seconds * 1000 + nanoseconds / 1e6);
  } else if (typeof value === "string" || typeof value === "number") date = new Date(value);
  else return null;
  return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
}

// Handle ISO endpoint responses and serialized Firestore timestamps without
// losing arrivals to NaN buckets. Browser timezone must not shift clinic hours.
export function buildArrivalTimeData(patients = []) {
  const hours = new Array(24).fill(0);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_TIMEZONE,
    hour: "2-digit",
    hourCycle: "h23",
  });
  for (const patient of patients) {
    const date = arrivalDate(patient?.start_time);
    if (!date) continue;
    const hour = Number(formatter.formatToParts(date)
      .find((part) => part.type === "hour")?.value);
    if (Number.isInteger(hour) && hour >= 0 && hour < 24) hours[hour]++;
  }
  return hours.map((count, hour) => ({ hour, count }));
}
