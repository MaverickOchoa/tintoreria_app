// src/ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const getToken = () => localStorage.getItem("access_token");

const safeJson = (raw) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getClaims = () => safeJson(localStorage.getItem("user_claims")) || {};

const ProtectedRoute = ({ allowedRoles }) => {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;

  // ✅ Si no pasas allowedRoles, solo valida login
  if (!allowedRoles || allowedRoles.length === 0) {
    return <Outlet />;
  }

  const claims = getClaims();

  // ✅ FIX: role fallback (claims -> localStorage -> null)
  const roleFromClaims = claims?.role ?? null;
  const roleFromLS = localStorage.getItem("role") || null;
  const role = roleFromClaims || roleFromLS;

  // ✅ IMPORTANT: NO borres la sesión aquí.
  // Si role falta, solo redirige. Borrar sesión aquí te provoca “rebote infinito”.
  if (!role) {
    return <Navigate to="/login" replace />;
  }

  const isAllowed = allowedRoles.includes(role);
  if (!isAllowed) {
    if (role === "super_admin")
      return <Navigate to="/super-admin-dashboard" replace />;
    if (role === "business_admin")
      return <Navigate to="/select-branch" replace />;
    if (role === "branch_manager")
      return <Navigate to="/branch-manager-dashboard" replace />;
    if (role === "employee") return <Navigate to="/manager-panel" replace />;
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
