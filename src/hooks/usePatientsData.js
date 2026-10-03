import { useCallback } from "react";
import { fetchPatientsData } from "../helpers/fetchPatientsData";
import { buildArrivalTimeData } from "../helpers/buildArrivalTimeData";

export function usePatientsData(t) {
  return useCallback(
    async (dateRange) => {
      const data = await fetchPatientsData(
        dateRange,
        process.env.REACT_APP_FIREBASE_DB,
        "both"
      );

      const processed = data.map((p) => ({
        ...p,
        station_type: t(p.station_type),
      }));
      const arrival = buildArrivalTimeData(data);

      return { processed, arrival };
    },
    [t]
  );
}

