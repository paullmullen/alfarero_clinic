import React, { createContext, useContext, useState } from "react";
import { Alert } from "antd";
const AlertContext = createContext();
const useAlert = () => useContext(AlertContext);

const AlertProvider = ({ children }) => {
  const [alert, setAlert] = useState(null);

  const showAlert = (message = "", description = "", type = "info") => {
    setAlert({ message, description, type });
    setTimeout(() => {
      setAlert(false);
    }, 3000);
  };
  const hideAlert = () => {
    setAlert(null);
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {alert && (
        <Alert
          message={alert.message}
          description={alert.description}
          type={alert.type}
          showIcon
          style={{
            position: "absolute",
            width: "100%",
            zIndex: 100,
            top: 0,
            left: 0,
          }}
        />
      )}
      {children}
    </AlertContext.Provider>
  );
};

export { AlertProvider, useAlert };
