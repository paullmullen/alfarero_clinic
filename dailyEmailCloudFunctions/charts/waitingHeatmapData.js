// Pure aggregation; durations are seconds, displayed averages are minutes.
export function timestampToDate(value) {
  let date = null;
  if (value instanceof Date) date = value;
  else if (typeof value?.toDate === "function") date = value.toDate();
  else if (typeof value === "number") date = new Date(value);
  else if (value && typeof (value._seconds ?? value.seconds) === "number") {
    date = new Date((value._seconds ?? value.seconds) * 1000 +
      (value._nanoseconds ?? value.nanoseconds ?? 0) / 1e6);
  }
  return date && Number.isFinite(date.getTime()) ? date : null;
}

export function buildWaitingHeatmapData(patientsSnapshot, {
  includeInProgress = false,
  startOfToday = null,
  startOfTomorrow = null,
  timezoneOffsetMinutes = 360,
  showDecimalMinutes = true,
} = {}) {
  const start = timestampToDate(startOfToday);
  const end = timestampToDate(startOfTomorrow);
  const samples = new Map();
  const stationSet = new Set();
  const hourSet = new Set();
  const diagnostics = { total: 0, included: 0, noTimestamp: 0,
    noWaitingTime: 0, badStatus: 0, outOfRange: 0 };
  const validStatus = new Set(includeInProgress
    ? ["complete", "in_process", "obs"] : ["complete"]);

  patientsSnapshot.forEach((doc) => {
    const plan = doc.data()?.plan_of_care;
    for (const step of Array.isArray(plan) ? plan : []) {
      if (!step) continue;
      // An existing encounter history is authoritative. Never add its cumulative
      // station total again, or fall back when its encounters are incomplete.
      const encounters = Array.isArray(step.encounters) && step.encounters.length
        ? step.encounters : [step];
      for (const encounter of encounters) {
        diagnostics.total++;
        const ws = timestampToDate(encounter?.waiting_start);
        if (!ws) { diagnostics.noTimestamp++; continue; }
        const seconds = encounter?.waiting_time;
        if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) {
          diagnostics.noWaitingTime++; continue;
        }
        if (!validStatus.has(encounter?.status)) {
          diagnostics.badStatus++; continue;
        }
        if ((start && ws < start) || (end && ws >= end)) {
          diagnostics.outOfRange++; continue;
        }
        const hour = new Date(ws.getTime() - timezoneOffsetMinutes * 60000).getUTCHours();
        const station = step.station ?? "unknown";
        const key = JSON.stringify([station, hour]);
        const aggregate = samples.get(key) ?? { sum: 0, count: 0 };
        aggregate.sum += seconds / 60;
        aggregate.count++;
        samples.set(key, aggregate);
        stationSet.add(station);
        hourSet.add(hour);
        diagnostics.included++;
      }
    }
  });
  const stations = [...stationSet].sort();
  const observedHours = [...hourSet].sort((a, b) => a - b);
  // Preserve elapsed hours: a gap is missing data, not a compressed timeline.
  const hours = observedHours.length ? Array.from(
    { length: observedHours.at(-1) - observedHours[0] + 1 },
    (_, i) => observedHours[0] + i,
  ) : [];
  const counts = stations.map(station => hours.map(hour =>
    samples.get(JSON.stringify([station, hour]))?.count ?? 0));
  const values = stations.map(station => hours.map(hour => {
    const aggregate = samples.get(JSON.stringify([station, hour]));
    if (!aggregate) return null;
    const average = aggregate.sum / aggregate.count;
    return showDecimalMinutes ? Number(average.toFixed(1)) : Math.round(average);
  }));
  return { stations, hours, values, counts, diagnostics };
}
