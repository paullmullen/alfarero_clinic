import React, { createContext, useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { firestore, auth } from "../helpers/firebaseConfig";

// PermissionsContext
const PermissionsContext = createContext({
  permissions: null,
  loading: true,
  user: null,
  setUserPermissions: () => {},
});

export const PermissionsProvider = ({ children }) => {
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const userRef = doc(firestore, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            let perms = userSnap.data().permissions || {
              basic: false,
              host: false,
              settings: false,
              stats: false,
            };

            // Backward-compat: old array-based permissions
            if (Array.isArray(perms)) {
              perms = perms[0] || {
                basic: false,
                host: false,
                settings: false,
                stats: false,
              };
              console.warn(
                "Converting array-based permissions to object:",
                perms,
              );
            }

            // Ensure "basic" always exists (your menu checks it)
            perms = {
              basic: false,
              host: false,
              settings: false,
              stats: false,
              ...perms,
            };

            setPermissions(perms);
          } else {
            setPermissions({
              basic: false,
              host: false,
              settings: false,
              stats: false,
            });
          }
        } catch (error) {
          console.error("Error fetching user permissions:", error);
          setPermissions({
            basic: false,
            host: false,
            settings: false,
            stats: false,
          });
        }
      } else {
        setPermissions(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const setUserPermissions = (newPermissions) => {
    setPermissions(newPermissions);
  };

  return (
    <PermissionsContext.Provider
      value={{ permissions, loading, user, setUserPermissions }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};

PermissionsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const usePermissions = () => useContext(PermissionsContext);
