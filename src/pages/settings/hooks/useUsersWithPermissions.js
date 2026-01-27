import { useEffect, useState } from "react";
import { firestore } from "../../../helpers/firebaseConfig";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";

export const useUsersWithPermissions = () => {
  const [users, setUsers] = useState([]);
  const [permissionKeys, setPermissionKeys] = useState([]);

  // Live load of users
  useEffect(() => {
    const usersRef = collection(firestore, "users");
    const q = query(usersRef, orderBy("name", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name ?? "Unknown",
          email: d.data().email ?? "Unknown",
          permissions:
            d.data().permissions && typeof d.data().permissions === "object"
              ? d.data().permissions
              : {},
        }));
        setUsers(data);
      },
      (err) => console.error("Error fetching users:", err),
    );

    return () => unsubscribe();
  }, []);

  // Build unique permission keys dynamically
  useEffect(() => {
    const all = new Set();
    users.forEach((u) => {
      Object.keys(u.permissions ?? {}).forEach((k) => all.add(k));
    });
    setPermissionKeys(Array.from(all).sort());
  }, [users]);

  // Update a single permission value
  const updatePermission = async (userId, key, value) => {
    try {
      const userRef = doc(firestore, "users", userId);
      const ts = Timestamp.now();

      await updateDoc(userRef, {
        [`permissions.${key}`]: value,
        updated: ts,
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                permissions: { ...u.permissions, [key]: value },
                updated: ts,
              }
            : u,
        ),
      );
    } catch (err) {
      console.error("Error updating permission:", err);
    }
  };

  return {
    users,
    permissionKeys,
    updatePermission,
  };
};
