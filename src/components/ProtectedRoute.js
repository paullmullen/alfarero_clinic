import React from "react";
import PropTypes from "prop-types";
import { Navigate } from "react-router-dom";
import { Spin } from "antd";
import { usePermissions } from "../providers/PermissionsProvider";

export const ProtectedRoute = ({ requiredPermission, children }) => {
  const { permissions, loading } = usePermissions();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
        <Spin />
      </div>
    );
  }

  if (!permissions) {
    return <Navigate to="/loginpage" replace />;
  }

  if (requiredPermission && !permissions?.[requiredPermission]) {
    return <Navigate to="/loginpage" replace />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  requiredPermission: PropTypes.string,
  children: PropTypes.node.isRequired,
};
