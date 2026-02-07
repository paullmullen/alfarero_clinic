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
import { useTranslation } from "react-i18next";

const ALL_LOCATIONS_ID = "__ALL__";

const ServiceLocationContext = createContext({
  locations: [],
  locationId: null,
  setLocationId: () => {},
  loading: true,
  ALL_LOCATIONS_ID,
});

export const ServiceLocationProvider = ({ children }) => {
  const [t] = useTranslation("global");

  const ALL_LOCATIONS_OPTION = useMemo(
    () => ({
      id: ALL_LOCATIONS_ID,
      name: t("ALL_LOCATIONS"),
      background_color: "#1890ff",
    }),
    [t],
  );

  const [rawLocations, setRawLocations] = useState([]);
  const [locationId, setLocationIdState] = useState(
    () => localStorage.getItem("service_location_id") || null,
  );
  const [loading, setLoading] = useState(true);

  const setLocationId = (id) => {
    const next = id || null;
    setLocationIdState(next);
    if (next) localStorage.setItem("service_location_id", next);
    else localStorage.removeItem("service_location_id");
  };

  const locations = useMemo(() => {
    // Always present "All Locations" at top
    return [ALL_LOCATIONS_OPTION, ...rawLocations];
  }, [ALL_LOCATIONS_OPTION, rawLocations]);

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

        if (!locationId) setLocationId(ALL_LOCATIONS_ID);
      },
    );

    return () => unsub();
    // You *can* include locationId safely, but leaving as-is matches your intent.
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
