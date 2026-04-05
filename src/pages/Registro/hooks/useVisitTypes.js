// src/pages/Registro/hooks/useVisitTypes.js
import { useEffect, useState } from "react";
import { fetchVisitTypes } from "../services/visitTypesService";

/**
 * Loads visit types and maps them into { value, label, stations } objects
 * compatible with your UI.
 */
export function useVisitTypes({ firestore, t }) {
  const [recipes, setRecipes] = useState([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const visitTypes = await fetchVisitTypes(firestore);

        const next = visitTypes
          .filter((item) => item.active !== false)
          .map((item) => ({
            value: item.name,
            label: t(item.name),
            stations: item.plan_of_care || [],
          }));

        if (alive) {
          setRecipes(next);
        }
      } catch (error) {
        console.error("Error fetching visit types:", error);
      }
    })();

    return () => {
      alive = false;
    };
  }, [firestore, t]);

  return { recipes };
}
