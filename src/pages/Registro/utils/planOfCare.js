// src/pages/Registro/utils/planOfCare.js
import { Timestamp } from "firebase/firestore";

/**
 * Builds a full plan_of_care array with all stations present.
 *
 * Rules:
 * - Preserve the exact order from visit_types.plan_of_care for included stations
 * - First included station starts as "waiting"
 * - Later included stations get "2", "3", "4", etc.
 * - Stations not included in the visit recipe are appended as "pending"
 */
export function buildPlanOfCare(stationsList, visits) {
  const statusList = [
    "waiting",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "7",
    "7",
    "7",
    "7",
    "7",
    "7",
    "7",
    "7",
    "7",
    "7",
  ];

  const result = [];
  const safeVisits = Array.isArray(visits) ? visits : [];
  const includedSet = new Set(safeVisits);
  const waitingStart = Timestamp.now();

  // First: included stations in the exact recipe order
  safeVisits.forEach((stationValue, index) => {
    const station = stationsList.find((s) => s.value === stationValue);
    if (!station) return;

    const status = statusList[index] || "7";

    result.push({
      order: result.length,
      station: station.value,
      status,
      ...(status === "waiting" ? { waiting_start: waitingStart } : {}),
    });
  });

  // Then: all remaining stations as pending
  stationsList.forEach((station) => {
    if (!station?.value) return;
    if (includedSet.has(station.value)) return;

    result.push({
      order: result.length,
      station: station.value,
      status: "pending",
    });
  });

  return result;
}
