import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "./firebaseConfig";
import { getPermissionsData } from "./getPermissionsData";
import PropTypes from "prop-types";

// Set session expiration time (in hours)
const SESSION_TIMEOUT_HOURS = 24;

// Create context with default values
const PermissionsContext = createContext({
  permissions: null,
  loading: true,
  user: null,
  setUserPermissions: () => {},
});

// Provider component
export const PermissionsProvider = ({ children }) => {
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Current user: ", user);
      if (user) {
        const lastSignIn = new Date(user.metadata.lastSignInTime).getTime();
        const now = Date.now();
        const hoursSinceSignIn = (now - lastSignIn) / (1000 * 60 * 60);

        if (hoursSinceSignIn > SESSION_TIMEOUT_HOURS) {
          console.log("Session expired. Logging out...");
          await signOut(auth);
          setUser(null);
          setPermissions(null);
          navigate("/login");
        } else {
          setUser(user);
        }
      } else {
        setUser(null);
        setPermissions(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (user) {
        try {
          const permissionsData = await getPermissionsData(user.uid);
          console.log("Permissions:", permissionsData.permissions);
          setPermissions(permissionsData);
        } catch (error) {
          console.error("Error fetching permissions:", error);
        }
      }
    };

    fetchPermissions();
  }, [user]);

  // Allow manual setting of user and permissions (e.g. after login)
  const setUserPermissions = async (newUser) => {
    setUser(newUser);
    if (newUser) {
      try {
        const permissionsData = await getPermissionsData(newUser.uid);
        setPermissions(permissionsData);
      } catch (error) {
        console.error("Error setting user permissions:", error);
      }
    } else {
      setPermissions(null);
    }
  };

  return (
    <PermissionsContext.Provider
      value={{ permissions, loading, user, setUserPermissions }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};

// Custom hook to use PermissionsContext
export const usePermissions = () => {
  return useContext(PermissionsContext);
};

PermissionsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
