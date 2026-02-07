import { useEffect, useMemo, useState } from "react";

const ALL_LOCATIONS_ID = "__ALL__";

export function usePatientCount({
  enabled = true,
  intervalMs = 60000,
  url = "https://us-central1-alfarero-478ad.cloudfunctions.net/getPatientCount",
  database = process.env.REACT_APP_FIREBASE_DB,
  locationId = null, // ✅ caller passes the sider-selected value
} = {}) {
  const [count, setCount] = useState(0);

  const getRangePayload = useMemo(() => {
    return () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);

      const payload = {
        database,
        startTimestamp: {
          seconds: Math.floor(today.getTime() / 1000),
          nanoseconds: 0,
        },
        endTimestamp: {
          seconds: Math.floor(tomorrow.getTime() / 1000),
          nanoseconds: 0,
        },
      };

      // ✅ only include locationId when filtering to a specific clinic
      if (locationId && locationId !== ALL_LOCATIONS_ID) {
        payload.locationId = locationId;
      }

      return payload;
    };
  }, [database, locationId]);

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    const fetchPatientCount = async () => {
      try {
        const payload = getRangePayload();

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Network response was not ok");

        const data = await response.json();

        if (isMounted) setCount(data.records || 0);
      } catch (error) {
        console.error("Error fetching patients:", error);
      }
    };

    fetchPatientCount();
    const interval = setInterval(fetchPatientCount, intervalMs);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [enabled, intervalMs, url, getRangePayload]);

  return { count };
}
