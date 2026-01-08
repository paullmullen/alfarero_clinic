import { useCallback } from "react";
import { fetchPatientsData } from "../helpers/fetchPatientsData";

export function usePatientsData(t) {
  return useCallback(
    async (dateRange) => {
      const data = await fetchPatientsData(
        dateRange,
        process.env.REACT_APP_FIREBASE_DB,
        "both"
      );

      const hours = new Array(24).fill(0);
      const processed = data.map((p) => {
        const date = new Date(p.start_time);
        const hour = date.getHours();
        hours[hour]++;

        return { ...p, station_type: t(p.station_type) };
      });

      const arrival = hours.map((count, hour) => ({ hour, count }));

      return { processed, arrival };
    },
    [t]
  );
}
``;
