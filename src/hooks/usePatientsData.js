import { useCallback } from "react";
import { fetchPatientsData } from "../helpers/fetchPatientsData";
import {
  buildArrivalTimeData,
  parseVisitTimestamp,
} from "../helpers/buildArrivalTimeData";

export function usePatientsData(t) {
  return useCallback(
    async (dateRange) => {
      const data = await fetchPatientsData(
        dateRange,
        process.env.REACT_APP_FIREBASE_DB,
        "both"
      );

      const endTime = dateRange[1].toMillis();
      const inRange = data.filter((patient) => {
        const start = parseVisitTimestamp(patient.start_time);
        return start !== null && start.getTime() < endTime;
      });
      const processed = inRange.map((p) => ({
        ...p,
        station_type: t(p.station_type),
      }));
      const arrival = buildArrivalTimeData(inRange);

      return { processed, arrival };
    },
    [t]
  );
}

