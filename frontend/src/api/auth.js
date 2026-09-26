// frontend/src/api/auth.js
import { jwtDecode } from "jwt-decode";

const TOKEN_KEY = "access_token";
const CLAIMS_KEY = "user_claims";
const ROLE_KEY = "role";
const BUSINESS_ID_KEY = "business_id";

export const decodeToken = (token) => {
  try {
    return jwtDecode(token);
  } catch (error) {
    return null;
  }
};

export const setAuthSession = ({ access_token, claims }) => {
  localStorage.setItem(TOKEN_KEY, access_token);

  // claims: lo ideal es que venga del backend (role, business_id, branch_id, is_superadmin, user_id)
  if (claims) localStorage.setItem(CLAIMS_KEY, JSON.stringify(claims));

  // Si quieres mantener compatibilidad con tu frontend actual:
  if (claims?.role) localStorage.setItem(ROLE_KEY, claims.role);
  if (claims?.business_id !== undefined && claims?.business_id !== null) {
    localStorage.setItem(BUSINESS_ID_KEY, String(claims.business_id));
  } else {
    localStorage.removeItem(BUSINESS_ID_KEY);
  }
};

export const clearAuthSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CLAIMS_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(BUSINESS_ID_KEY);
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getAuthClaims = () => {
  const storedClaims = localStorage.getItem(CLAIMS_KEY);
  if (!storedClaims) return {};
  try {
    return JSON.parse(storedClaims);
  } catch (e) {
    console.error("Error al parsear claims de localStorage:", e);
    return {};
  }
};

export const isLoggedIn = () => !!getToken();

export const isSuperAdmin = () => {
  const claims = getAuthClaims();
  // Soporta 2 estilos: is_superadmin o role
  if (claims?.is_superadmin === true) return true;
  if (claims?.role === "super_admin") return true;
  return false;
};
