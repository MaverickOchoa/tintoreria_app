import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  Box, Typography, Chip, Paper, Skeleton, Divider, 
  Fab, Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, FormControl, InputLabel, Select, MenuItem
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
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
  
  // Metadata state
  const [services, setServices] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ date: "", time: "", reason: "", doctor_id: "", clinic_service_id: "" });

  const loadAppointments = () => {
    setLoading(true);
    fetch(`${CLINIC_API}/clinic/portal/appointments`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setAppointments(d.appointments || []))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  };

  const loadMetadata = () => {
    fetch(`${CLINIC_API}/clinic/portal/booking-metadata`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        setServices(d.services || []);
        setDoctors(d.doctors || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadAppointments();
    loadMetadata();
  }, [token]);

  const upcoming = appointments.filter(a => ["scheduled", "confirmed"].includes(a.status));
  const past = appointments.filter(a => !["scheduled", "confirmed"].includes(a.status));

  const handleBookAppointment = async () => {
    if (!formData.date || !formData.time) {
      alert("Debes seleccionar fecha y hora.");
      return;
    }
    const scheduled_at = new Date(`${formData.date}T${formData.time}`).toISOString();
    
    setSaving(true);
    try {
      const res = await fetch(`${CLINIC_API}/clinic/portal/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          scheduled_at, 
          reason: formData.reason,
          doctor_id: formData.doctor_id || null,
          clinic_service_id: formData.clinic_service_id || null
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al agendar");
      alert("¡Cita agendada exitosamente!");
      setOpenDialog(false);
      setFormData({ date: "", time: "", reason: "", doctor_id: "", clinic_service_id: "" });
      loadAppointments();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

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
    <Box sx={{ p: { xs: 2, sm: 4 }, maxWidth: 800, mx: "auto", position: "relative", minHeight: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <CalendarMonthIcon sx={{ color: "#4361ee" }} />
        <Typography variant="h5" fontWeight={800} color="#1a1a2e">
          Mis Citas
        </Typography>
      </Box>

      {loading ? (
        <Box><Skeleton height={100} /><Skeleton height={100} /></Box>
      ) : (
        <>
          {upcoming.length > 0 && (
            <Box mb={4}>
              <Typography fontWeight={700} color="#4b5563" mb={2} fontSize={14}>PRÓXIMAS CITAS</Typography>
              {upcoming.map(a => <AppCard key={a.id} a={a} />)}
            </Box>
          )}

          {past.length > 0 && (
            <Box>
              <Typography fontWeight={700} color="#4b5563" mb={2} fontSize={14}>HISTORIAL</Typography>
              {past.map(a => <AppCard key={a.id} a={a} />)}
            </Box>
          )}

          {appointments.length === 0 && (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <CalendarMonthIcon sx={{ fontSize: 48, color: "#cbd5e1", mb: 2 }} />
              <Typography color="#64748b">No tienes citas registradas.</Typography>
            </Box>
          )}
        </>
      )}

      {/* Floating Action Button for Mobile Booking */}
      <Fab 
        color="primary" 
        aria-label="add" 
        onClick={() => setOpenDialog(true)}
        sx={{ 
          position: "fixed", 
          bottom: { xs: 80, sm: 24 }, // higher on mobile to avoid bottom nav
          right: 24, 
          bgcolor: "#4361ee",
          "&:hover": { bgcolor: "#3251d3" }
        }}
      >
        <AddIcon />
      </Fab>

      {/* Book Appointment Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Agendar Nueva Cita</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, py: 1 }}>
            
            {services.length > 0 && (
              <FormControl fullWidth>
                <InputLabel>Servicio</InputLabel>
                <Select
                  label="Servicio"
                  value={formData.clinic_service_id}
                  onChange={e => setFormData({ ...formData, clinic_service_id: e.target.value })}
                >
                  <MenuItem value=""><em>-- Seleccionar --</em></MenuItem>
                  {services.map(s => (
                    <MenuItem key={s.id} value={s.id}>{s.name} - ${s.price}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {doctors.length > 0 && (
              <FormControl fullWidth>
                <InputLabel>Doctor (Opcional)</InputLabel>
                <Select
                  label="Doctor (Opcional)"
                  value={formData.doctor_id}
                  onChange={e => setFormData({ ...formData, doctor_id: e.target.value })}
                >
                  <MenuItem value=""><em>-- Sin preferencia --</em></MenuItem>
                  {doctors.map(d => (
                    <MenuItem key={d.id} value={d.id}>Dr(a). {d.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              label="Fecha"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
            />
            <TextField
              label="Hora"
              type="time"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={formData.time}
              onChange={e => setFormData({ ...formData, time: e.target.value })}
            />
            <TextField
              label="Motivo de la cita (Opcional)"
              multiline
              rows={2}
              fullWidth
              placeholder="Ej. Chequeo de rutina"
              value={formData.reason}
              onChange={e => setFormData({ ...formData, reason: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
          <Button onClick={() => setOpenDialog(false)} sx={{ color: "#64748b" }}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={handleBookAppointment} 
            disabled={saving}
            sx={{ bgcolor: "#4361ee", "&:hover": { bgcolor: "#3251d3" }, borderRadius: 2 }}
          >
            Confirmar Cita
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
