// frontend/src/api/business.js
import { http } from "./http";

export const createBusiness = async (payload) => {
  // Ajusta el endpoint a tu backend real.
  // Yo lo dejo estándar:
  // POST /api/v1/businesses
  const { data } = await http.post("/api/v1/businesses", payload);
  return data;
};

export const listBusinesses = async () => {
  const { data } = await http.get("/api/v1/businesses");
  return data;
};
