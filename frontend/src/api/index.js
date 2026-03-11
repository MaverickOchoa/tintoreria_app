// src/api/index.js

import axios from "axios";

// URL base de tu backend Flask
const API_URL = "http://127.0.0.1:5000";

// Crear una instancia de Axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para agregar el token automáticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ===============================
// 📌 Funciones para Empleados y Roles
// ===============================

/**
 * Obtiene la lista de roles disponibles.
 */
export const getRoles = async () => {
  try {
    const response = await api.get("/roles");
    return response.data.roles;
  } catch (error) {
    throw error.response?.data || new Error("Error al obtener los roles");
  }
};

/**
 * Obtiene las sucursales del negocio del usuario.
 * @param {number} businessId El ID del negocio
 */
export const getBranches = async (businessId) => {
  try {
    if (!businessId) {
      throw new Error(
        "ID de negocio es requerido para obtener las sucursales."
      );
    }
    const response = await api.get(`/businesses/${businessId}/branches`);
    return response.data.branches;
  } catch (error) {
    throw error.response?.data || new Error("Error al obtener las sucursales");
  }
};

/**
 * Crea un empleado en el negocio actual.
 */
export const createEmployee = async (employeeData) => {
  try {
    const response = await api.post("/employees", employeeData);
    return response.data;
  } catch (error) {
    throw error.response?.data || new Error("Error al crear el empleado");
  }
};

// Exportación principal
export default api;
