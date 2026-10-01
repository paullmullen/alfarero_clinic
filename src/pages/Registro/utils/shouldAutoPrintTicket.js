// Pending entries exist for every unused station; they are not part of the visit.
export function shouldAutoPrintTicket(location, planOfCare) {
  const selectedStations = location?.auto_print_stations;
  if (!Array.isArray(selectedStations) || !Array.isArray(planOfCare)) return false;

  return planOfCare.some(
    (visit) =>
      (visit?.status === "waiting" || visit?.status === "planned") &&
      selectedStations.includes(visit.station),
  );
}
