import { useEffect, useMemo, useState, useCallback } from "react";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { firestore } from "../../../helpers/firebaseConfig";

const COLLECTION_NAME = "visit_types";

const normalizeOrder = (items) =>
  [...items].sort((a, b) => {
    const aOrder = Number.isFinite(a.order) ? a.order : 999999;
    const bOrder = Number.isFinite(b.order) ? b.order : 999999;
    return aOrder - bOrder;
  });

export const useVisitTypes = () => {
  const [visitTypes, setVisitTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = collection(firestore, COLLECTION_NAME);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const rows = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        setVisitTypes(normalizeOrder(rows));
        setLoading(false);
      },
      (error) => {
        console.error("Error loading visit_types:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const activeVisitTypes = useMemo(
    () => visitTypes.filter((item) => item.active !== false),
    [visitTypes],
  );

  const saveField = useCallback(async (id, patch) => {
    const ref = doc(firestore, COLLECTION_NAME, id);

    if (
      Object.prototype.hasOwnProperty.call(patch, "plan_of_care") &&
      !patch.plan_of_care.includes("reg")
    ) {
      throw new Error("Every visit type must include reg in plan_of_care.");
    }

    await updateDoc(ref, {
      ...patch,
      updated_at: serverTimestamp(),
    });
  }, []);

  const createVisitType = useCallback(
    async ({
      id,
      visit_type,
      name,
      aliases = [],
      plan_of_care = ["reg"],
      active = true,
    }) => {
      const cleanId = String(id || "").trim();

      if (!cleanId) {
        throw new Error("A document ID is required.");
      }

      if (!plan_of_care.includes("reg")) {
        throw new Error("Every visit type must include reg in plan_of_care.");
      }

      const nextOrder =
        visitTypes.length > 0
          ? Math.max(
              ...visitTypes.map((item) =>
                Number.isFinite(item.order) ? item.order : 0,
              ),
            ) + 1
          : 1;

      const ref = doc(firestore, COLLECTION_NAME, cleanId);

      await setDoc(ref, {
        visit_type: visit_type || "",
        name: name || "",
        aliases,
        plan_of_care,
        order: nextOrder,
        active,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    },
    [visitTypes],
  );

  const reorderVisitTypes = useCallback(async (orderedIds) => {
    const batch = writeBatch(firestore);

    orderedIds.forEach((id, index) => {
      const ref = doc(firestore, COLLECTION_NAME, id);
      batch.update(ref, {
        order: index + 1,
        updated_at: serverTimestamp(),
      });
    });

    await batch.commit();
  }, []);

  const moveVisitType = useCallback(
    async (id, direction) => {
      const ordered = normalizeOrder(visitTypes);
      const currentIndex = ordered.findIndex((item) => item.id === id);

      if (currentIndex === -1) return;

      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= ordered.length) return;

      const next = [...ordered];
      const [moved] = next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, moved);

      await reorderVisitTypes(next.map((item) => item.id));
    },
    [visitTypes, reorderVisitTypes],
  );

  const toggleActive = useCallback(
    async (id, nextActive) => {
      await saveField(id, { active: nextActive });
    },
    [saveField],
  );

  return {
    visitTypes,
    activeVisitTypes,
    loading,
    createVisitType,
    saveField,
    moveVisitType,
    reorderVisitTypes,
    toggleActive,
  };
};
