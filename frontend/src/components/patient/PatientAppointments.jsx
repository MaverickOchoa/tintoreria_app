import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Box, Typography, Chip, Paper, Skeleton, Divider } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

const CLINIC_API = import.meta.env.VITE_CLINIC_API_URL || import.meta.env.VITE_API_URL || "";

const STATUS_LABELS = {
  scheduled: { label: "Agendada", color: "#3b82f6", bg: "#eff6ff" },
  confirmed: { label: "Confirmada", color: "#10b981", bg: "#ecfdf5" },
  in_progress: { label: "En Consulta", color: "#f59e0b", bg: "#fffbeb" },
  completed: { label: "Completada", color: "#6366f1", bg: "#f0f4ff" },
  cancelled: { label: "Cancelada", color: "#ef4444", bg: "#fef2f2" },
  no_show: { label: "No Show", color: "#9ca3af", bg: "#f9fafb" },
};

export default function PatientAppointments() {
  const { token } = useOutletContext();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${CLINIC_API}/clinic/portal/appointments`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setAppointments(d.appointments || []))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, [token]);

  const upcoming = appointments.filter(a => ["scheduled", "confirmed"].includes(a.status));
  const past = appointments.filter(a => !["scheduled", "confirmed"].includes(a.status));

  const AppCard = ({ a }) => {
    const cfg = STATUS_LABELS[a.status] || STATUS_LABELS.scheduled;
    return (
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: "1px solid #e5e7eb", mb: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography fontWeight={700} fontSize={14}>{a.service_name || "Consulta"}</Typography>
            <Typography fontSize={12} color="text.secondary" mt={0.3}>
              {a.scheduled_at ? new Date(a.scheduled_at).toLocaleString("es-MX", { dateStyle: "full", timeStyle: "short" }) : "—"}
            </Typography>
            {a.doctor_name && <Typography fontSize={12} color="text.secondary">Dr. {a.doctor_name}</Typography>}
            {a.reason && <Typography fontSize={12} color="text.secondary" mt={0.5}>Motivo: {a.reason}</Typography>}
          </Box>
          <Chip label={cfg.label} size="small" sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: 11 }} />
        </Box>
      </Paper>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <CalendarMonthIcon sx={{ color: "#4361ee" }} />
        <Typography variant="h6" fontWeight={800}>Mis Citas</Typography>
      </Box>

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={80} sx={{ borderRadius: 2, mb: 1 }} />)
      ) : (
        <>
          {upcoming.length > 0 && (
            <>
              <Typography fontSize={12} fontWeight={700} color="#4361ee" textTransform="uppercase" letterSpacing={1} mb={1.5}>
                Próximas citas
              </Typography>
              {upcoming.map(a => <AppCard key={a.id} a={a} />)}
              <Divider sx={{ my: 2.5 }} />
            </>
          )}
          <Typography fontSize={12} fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={1} mb={1.5}>
            Historial
          </Typography>
          {past.length === 0 && upcoming.length === 0 ? (
            <Typography color="text.secondary" fontSize={14} textAlign="center" mt={6}>No tienes citas registradas.</Typography>
          ) : past.length === 0 ? (
            <Typography color="text.secondary" fontSize={13}>Sin historial anterior.</Typography>
          ) : (
            past.map(a => <AppCard key={a.id} a={a} />)
          )}
        </>
      )}
    </Box>
  );
}
