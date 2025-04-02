import React, { createContext, useContext, useState, useEffect } from "react";

// Create context with default values
const PermissionsContext = createContext({
  permissions: null,
  loading: true,
  user: null,
  setUserPermissions: () => {},
});

// Provider component to wrap around your app
export const PermissionsProvider = ({ children }) => {
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Fetch permissions when user changes
    const fetchPermissions = async () => {
      if (user) {
        try {
          // Replace this with your actual permissions-fetching logic
          const permissionsData = await getPermissionsData(user.uid);
          setPermissions(permissionsData);
        } catch (error) {
          console.error("Error fetching permissions:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user]); // Runs when `user` changes

  // Function to update user in context
  const setUserPermissions = (newUser) => {
    setUser(newUser);
    setLoading(true); // Set loading to true while fetching new permissions
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
