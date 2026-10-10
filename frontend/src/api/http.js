// frontend/src/api/http.js
import axios from "axios";
import { getToken, clearAuthSession } from "./auth";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

export const http = axios.create({
  baseURL: API,
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    // Si el token ya no sirve, limpiamos sesión
    if (err?.response?.status === 401) {
      clearAuthSession();
    }
    return Promise.reject(err);
  }
);
