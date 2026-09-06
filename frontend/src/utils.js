import { jwtDecode } from "jwt-decode";
export * from "./api/auth";

/**
 * Capitaliza la primera letra de cada palabra en una cadena.
 * @param {string} str La cadena a formatear.
 * @returns {string} La cadena con la primera letra de cada palabra en mayúscula.
 */
export const isValidPhone = (phone) =>
  /^\d{10}$/.test((phone || "").replace(/[\s\-\(\)\.]/g, ""));

export const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email || "");

export const toTitleCase = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => {
      if (word.length === 0) return "";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
};
