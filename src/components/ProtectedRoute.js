import React from "react";
import PropTypes from "prop-types";
import { Navigate } from "react-router-dom";
import { usePermissions } from "../pages/RouterPage";

export const ProtectedRoute = ({ children, requiredPermission }) => {
  const { permissions, loading, user } = usePermissions();

  if (loading) return null;

  if (!user || !permissions?.[requiredPermission]) {
    return <Navigate to="/turnos" />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  requiredPermission: PropTypes.string.isRequired,
};
