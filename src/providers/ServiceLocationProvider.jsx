import React, { createContext, useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { firestore } from "../helpers/firebaseConfig";

// ServiceLocationContext
const ServiceLocationContext = createContext({
  locations: [],
  locationId: null,
  setLocationId: () => {},
  loading: true,
});

export const ServiceLocationProvider = ({ children }) => {
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationIdState] = useState(
    () => localStorage.getItem("service_location_id") || null,
  );
  const [loading, setLoading] = useState(true);

  // Keep localStorage in sync
  const setLocationId = (id) => {
    setLocationIdState(id || null);
    if (id) localStorage.setItem("service_location_id", id);
    else localStorage.removeItem("service_location_id");
  };

  useEffect(() => {
    // Listen to locations, sorted by name
    const q = query(collection(firestore, "locations"), orderBy("name", "asc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setLocations(rows);
        setLoading(false);

        // If the currently selected location is missing, reset it
        if (locationId && !rows.some((r) => r.id === locationId)) {
          setLocationId(null);
        }

        // If nothing selected yet, auto-select the first location (optional)
        if (!locationId && rows.length > 0) {
          setLocationId(rows[0].id);
        }
      },
      (err) => {
        console.error("Error loading locations:", err);
        setLocations([]);
        setLoading(false);
      },
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ServiceLocationContext.Provider
      value={{ locations, locationId, setLocationId, loading }}
    >
      {children}
    </ServiceLocationContext.Provider>
  );
};

ServiceLocationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useServiceLocation = () => useContext(ServiceLocationContext);
