export function buildLocationVolumeData({
  patients = [],
  labels = [],
  timeZone = "America/Guatemala",
}) {
  const labelIndexByYmd = Object.fromEntries(
    labels.map((ymd, index) => [ymd, index]),
  );

  const seriesByLocationId = Object.create(null);

  for (const patient of patients) {
    const locationId = String(patient?.location_id ?? "").trim() || "__UNASSIGNED__";

    const locationName =
      (locationId === "__UNASSIGNED__" ? "Sin ubicación" :
        String(patient?.location_name ?? "").trim() || locationId);

    const startDate = timestampToDate(patient?.start_time);
    if (!startDate || !Number.isFinite(startDate.getTime())) continue;

    const ymd = formatDateToYmdInTimeZone(startDate, timeZone);
    const dayIndex = labelIndexByYmd[ymd];
    if (dayIndex === undefined) continue;

    if (!seriesByLocationId[locationId]) {
      seriesByLocationId[locationId] = {
        locationId,
        label: locationName,
        data: labels.map(() => 0),
      };
    }

    seriesByLocationId[locationId].data[dayIndex] += 1;
  }

  return Object.values(seriesByLocationId);
}

export function buildLocationsById(locations = []) {
  return Object.fromEntries(
    (Array.isArray(locations) ? locations : [])
      .filter((location) => String(location?.id ?? "").trim())
      .map((location) => [String(location.id).trim(), location]),
  );
}

function timestampToDate(value) {
  if (!value) return null;

  if (typeof value?.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "number") {
    return new Date(value);
  }

  return null;
}

function formatDateToYmdInTimeZone(date, timeZone = "America/Guatemala") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

