import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { firestore } from "../helpers/firebaseConfig";

export default function useCancellationReasons() {
  const [reasonsRaw, setReasonsRaw] = useState([]);
  const [loadingReasons, setLoadingReasons] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(firestore, "cancellation_reasons"),
      (snapshot) => {
        const rows = snapshot.docs.map((doc) => {
          const data = doc.data() || {};
          const normalizedCode = String(data.code || doc.id || "")
            .trim()
            .toLowerCase();

          return {
            id: doc.id,
            ...data,
            code: normalizedCode,
          };
        });

        setReasonsRaw(rows);
        setLoadingReasons(false);
      },
      () => {
        setReasonsRaw([]);
        setLoadingReasons(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const activeReasons = useMemo(() => {
    return [...(reasonsRaw || [])]
      .filter((item) => item?.active === true && !!item?.code)
      .sort((a, b) => {
        const orderA =
          typeof a?.order === "number" ? a.order : Number.POSITIVE_INFINITY;
        const orderB =
          typeof b?.order === "number" ? b.order : Number.POSITIVE_INFINITY;

        if (orderA !== orderB) return orderA - orderB;
        return String(a?.code || "").localeCompare(String(b?.code || ""));
      });
  }, [reasonsRaw]);

  return {
    reasonsRaw,
    activeReasons,
    loadingReasons,
  };
}
