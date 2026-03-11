// frontend/src/api/http.js
import axios from "axios";
import { getToken, clearAuthSession } from "./auth";

export const http = axios.create({
  baseURL: "http://127.0.0.1:5000",
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
