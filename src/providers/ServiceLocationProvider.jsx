import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import PropTypes from "prop-types";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { firestore } from "../helpers/firebaseConfig";

const ALL_LOCATIONS_ID = "__ALL__";
const ALL_LOCATIONS_OPTION = {
  id: ALL_LOCATIONS_ID,
  name: "All Locations",
  // Choose a sensible default highlight color for "All"
  background_color: "#1890ff",
};

const ServiceLocationContext = createContext({
  locations: [],
  locationId: null,
  setLocationId: () => {},
  loading: true,
  ALL_LOCATIONS_ID,
});

export const ServiceLocationProvider = ({ children }) => {
  const [rawLocations, setRawLocations] = useState([]);
  const [locationId, setLocationIdState] = useState(
    () => localStorage.getItem("service_location_id") || null,
  );
  const [loading, setLoading] = useState(true);

  const locations = useMemo(() => {
    // Always present "All Locations" at top
    return [ALL_LOCATIONS_OPTION, ...rawLocations];
  }, [rawLocations]);

  const setLocationId = (id) => {
    const next = id || null;
    setLocationIdState(next);
    if (next) localStorage.setItem("service_location_id", next);
    else localStorage.removeItem("service_location_id");
  };

  useEffect(() => {
    const q = query(collection(firestore, "locations"), orderBy("name", "asc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setRawLocations(rows);
        setLoading(false);

        // If the selected id is not ALL and no longer exists, reset to ALL
        if (
          locationId &&
          locationId !== ALL_LOCATIONS_ID &&
          !rows.some((r) => r.id === locationId)
        ) {
          setLocationId(ALL_LOCATIONS_ID);
        }

        // If nothing selected yet, default to ALL (view mode)
        if (!locationId) {
          setLocationId(ALL_LOCATIONS_ID);
        }
      },
      (err) => {
        console.error("Error loading locations:", err);
        setRawLocations([]);
        setLoading(false);

        // Still ensure we have something selected
        if (!locationId) setLocationId(ALL_LOCATIONS_ID);
      },
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ServiceLocationContext.Provider
      value={{
        locations,
        locationId,
        setLocationId,
        loading,
        ALL_LOCATIONS_ID,
      }}
    >
      {children}
    </ServiceLocationContext.Provider>
  );
};

ServiceLocationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useServiceLocation = () => useContext(ServiceLocationContext);
export { ALL_LOCATIONS_ID };
