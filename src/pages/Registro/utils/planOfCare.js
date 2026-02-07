// src/pages/Registro/utils/planOfCare.js
import { Timestamp } from "firebase/firestore";

/**
 * Builds a full plan_of_care array with all stations present.
 * Stations that are not in visits are "pending".
 * Stations that are in visits are assigned a "status" from statusList.
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

  const visitsSet = new Set(visits || []);
  const stationOrder = [
    "reg",
    "nur",
    "doc",
    "ped",
    "og",
    "lab",
    "pha",
    "pt",
    "den",
    "nut",
    "psi",
    "ora",
  ];

  const result = [];
  let order = 0;

  stationOrder.forEach((stationValue) => {
    const station = stationsList.find((s) => s.value === stationValue);
    if (!station) return;

    const used = visitsSet.has(stationValue);

    if (used) {
      const status = statusList[order + 1] ?? "waiting"; // mimic original ordering pattern safely
      const row = {
        order: order++,
        station: station.value,
        status,
        ...(status === "waiting" ? { waiting_start: Timestamp.now() } : {}),
      };
      result.push(row);
    } else {
      result.push({
        order: order++,
        station: station.value,
        status: "pending",
      });
    }
  });

  return result;
}
