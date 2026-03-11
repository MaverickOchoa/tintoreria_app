// src/api.js

export const API_BASE_URL = import.meta.env.VITE_API_URL || API;

export function getToken() {
  return localStorage.getItem("access_token");
}

export function authHeaders(extra = {}) {
  const token = getToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Para no volver a equivocarte con /api/v1
export function apiUrl(path) {
  // path ejemplo: "/services/" o "/businesses/4"
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}/api/v1${clean}`;
}
