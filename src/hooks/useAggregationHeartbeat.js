import { useEffect } from "react";
import {
  Timestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { firestore } from "../helpers/firebaseConfig";

export function useAggregationHeartbeat({
  enabled = true,
  intervalMs = 60000,
} = {}) {
  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    const checkAndUpdateTimestamp = async () => {
      const timestampRef = doc(firestore, "run_aggregation", "timestamp");

      try {
        const docSnapshot = await getDoc(timestampRef);

        if (!isMounted) return;

        if (docSnapshot.exists()) {
          const lastUpdated = docSnapshot.data().last_updated;

          if (lastUpdated instanceof Timestamp) {
            const now = Timestamp.now();
            const diffInSeconds = now.seconds - lastUpdated.seconds;

            if (diffInSeconds >= Math.floor(intervalMs / 1000)) {
              await updateDoc(timestampRef, {
                last_updated: serverTimestamp(),
              });
            }
          } else {
            console.error(
              "run_aggregation timestamp is not a Firestore Timestamp.",
            );
          }
        } else {
          await setDoc(timestampRef, { last_updated: serverTimestamp() });
          console.log(
            "run_aggregation timestamp document created with current time.",
          );
        }
      } catch (error) {
        console.error(
          "Error checking or updating run_aggregation timestamp:",
          error,
        );
      }
    };

    // Kick once immediately, then interval
    checkAndUpdateTimestamp();
    const interval = setInterval(checkAndUpdateTimestamp, intervalMs);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [enabled, intervalMs]);
}
