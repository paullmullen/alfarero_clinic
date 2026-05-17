import { useEffect, useState } from "react";
import { firestore } from "../../../helpers/firebaseConfig";
import {
  collection,
  getDocs,
  updateDoc,
  addDoc,
  doc,
} from "firebase/firestore";

export const useLocations = () => {
  const [locations, setLocations] = useState([]);

  // Load locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const ref = collection(firestore, "locations");
        const snap = await getDocs(ref);
        const data = snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name,
          message: d.data().message ?? "",
          active: d.data().active ?? true,
          stations: d.data().stations ?? [],
          services: d.data().services ?? [],
          background_color: d.data().background_color ?? "#ffffff",
          latitude: d.data().latitude ?? 0,
          longitude: d.data().longitude ?? 0,
          printing: d.data().printing ?? { format: "letter" },
        }));
        setLocations(data);
      } catch (e) {
        console.error("Error loading locations:", e);
      }
    };

    fetchLocations();
  }, []);

  // Update a location field
  const updateLocation = async (locationId, key, value) => {
    try {
      const ref = doc(firestore, "locations", locationId);
      await updateDoc(ref, { [key]: value });

      setLocations((prev) =>
        prev.map((loc) =>
          loc.id === locationId ? { ...loc, [key]: value } : loc,
        ),
      );
    } catch (e) {
      console.error("Error updating location:", e);
    }
  };

  // Add a new location
  const addLocation = async () => {
    try {
      const newLoc = {
        name: "New Location",
        background_color: "#ffffff",
        stations: [],
        latitude: 14.6232421,
        longitude: -90.5304184,
      };

      const ref = await addDoc(collection(firestore, "locations"), newLoc);
      setLocations((prev) => [...prev, { id: ref.id, ...newLoc }]);
    } catch (e) {
      console.error("Error adding location:", e);
    }
  };

  return {
    locations,
    updateLocation,
    addLocation,
  };
};
