import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function ModuleProtectedRoute({ moduleKey, children }) {
  const token = localStorage.getItem("authToken");
  const role = useSelector((state) => state.user.role);
  const currentAccessibleModules = useSelector(
    (state) => state.user.currentAccessibleModules,
  );

  if (!token) {
    return <Navigate to="/accounts/login" replace />;
  }

  // Allow initial render while auth bootstrap is still populating role/modules.
  if (role === "Guest-User") {
    return children;
  }

  if (!currentAccessibleModules?.[moduleKey]) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
