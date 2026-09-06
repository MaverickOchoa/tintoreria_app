export const STATUS_CONFIG = {
  Agendada:    { color: "#4361ee", bg: "#eef0fd", label: "Agendada",     emoji: "📅" },
  Confirmada:  { color: "#2ec4b6", bg: "#e8faf8", label: "Confirmada",   emoji: "✅" },
  "En Consulta": { color: "#f77f00", bg: "#fff3e0", label: "En Consulta", emoji: "🩺" },
  Completada:  { color: "#6c757d", bg: "#f1f3f5", label: "Completada",   emoji: "☑️" },
  "No Show":   { color: "#e63946", bg: "#fdecea", label: "No Show",      emoji: "🚫" },
  Cancelada:   { color: "#adb5bd", bg: "#f8f9fa", label: "Cancelada",    emoji: "✖️" },
};

export const DOCTOR_COLORS = [
  "#4361ee", "#e63946", "#2ec4b6", "#f77f00", "#7209b7",
  "#3a86ff", "#fb5607", "#8338ec", "#06d6a0", "#ef233c",
];

export const CLINIC_API = import.meta.env.VITE_CLINIC_API_URL || "https://saas-platform-api-u6k3.onrender.com/api/v2";
