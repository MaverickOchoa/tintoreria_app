export const BRAND = {
  name: "Zentro",
  verticals: {
    clinic: {
      name: "Zentro Clinic",
      tagline: "Gestión clínica inteligente",
      color: "#4361ee",
      colorDark: "#3451d1",
    },
    laundry: {
      name: "Zentro Cleaner",
      tagline: "Tintorería profesional",
      color: "#0096c7",
      colorDark: "#007ba6",
    },
  },
  footer: "Powered by Zentro",
  year: new Date().getFullYear(),
};

export function getVerticalBrand(verticalType) {
  return BRAND.verticals[verticalType] || BRAND.verticals.laundry;
}
