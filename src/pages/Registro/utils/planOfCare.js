// src/pages/Registro/utils/planOfCare.js
import { Timestamp } from "firebase/firestore";

/**
 * Builds a full plan_of_care array with all stations present.
 *
 * Rules:
 * - Preserve the exact order from visit_types.plan_of_care for included stations
 * - First included station starts as "waiting"
 * - Later included stations start as "planned"
 * - Stations not included in the visit recipe are "pending"
 * - route_order is the patient-specific intended sequence
 * - route_order is null for stations not in the planned visit
 */
export function buildPlanOfCare(stationsList, visits) {
  const result = [];
  const safeVisits = Array.isArray(visits) ? visits : [];
  const includedSet = new Set(safeVisits);
  const waitingStart = Timestamp.now();

  // First: included stations in the exact recipe order
  safeVisits.forEach((stationValue, index) => {
    const station = stationsList.find((s) => s.value === stationValue);
    if (!station) return;

    const routeOrder = index + 1;
    const isFirstStep = index === 0;

    result.push({
      route_order: routeOrder,
      station: station.value,
      status: isFirstStep ? "waiting" : "planned",
      ...(isFirstStep ? { waiting_start: waitingStart } : {}),
    });
  });

  // Then: all remaining stations as pending / not planned
  stationsList.forEach((station) => {
    if (!station?.value) return;
    if (includedSet.has(station.value)) return;

    result.push({
      route_order: null,
      station: station.value,
      status: "pending",
    });
  });

  return result;
}
