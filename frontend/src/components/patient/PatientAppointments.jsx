import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  Box, Typography, Chip, Paper, Skeleton, Divider, 
  Fab, Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, FormControl, InputLabel, Select, MenuItem,
  CircularProgress
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

const CLINIC_API = import.meta.env.VITE_CLINIC_API_URL || import.meta.env.VITE_API_URL || "";

const STATUS_LABELS = {
  "Agendada": { label: "Agendada", color: "#3b82f6", bg: "#eff6ff" },
  "Confirmada": { label: "Confirmada", color: "#10b981", bg: "#ecfdf5" },
  "En Consulta": { label: "En Consulta", color: "#f59e0b", bg: "#fffbeb" },
  "Completada": { label: "Completada", color: "#6366f1", bg: "#f0f4ff" },
  "Cancelada": { label: "Cancelada", color: "#ef4444", bg: "#fef2f2" },
  "No Show": { label: "No Show", color: "#9ca3af", bg: "#f9fafb" },
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
  
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  const [formData, setFormData] = useState({ reason: "", doctor_id: "", clinic_service_id: "" });

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
    const localBiz = localStorage.getItem("patient_business_id");
    const bizQuery = localBiz ? `?business_id=${localBiz}` : '';
    fetch(`${CLINIC_API}/clinic/portal/booking-metadata${bizQuery}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        if (!d.doctors || d.doctors.length === 0 || !d.services || d.services.length === 0) {
          alert("Debug Metadata: " + JSON.stringify(d.debug || {}));
        }
        setDoctors(d.doctors || []);
        setServices(d.services || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadAppointments();
    loadMetadata();
  }, [token]);

  useEffect(() => {
    if (!formData.doctor_id || !date) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    fetch(`${CLINIC_API}/clinic/doctors/${formData.doctor_id}/available-slots?date=${date}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        setSlots(d.slots || []);
        if (d.slots && !d.slots.includes(time)) setTime("");
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [formData.doctor_id, date]);

  const upcoming = appointments.filter(a => ["Agendada", "Confirmada"].includes(a.status));
  const past = appointments.filter(a => !["Agendada", "Confirmada"].includes(a.status));

  const handleBookAppointment = async () => {
    if (!date || !time) {
      alert("Debes seleccionar fecha y hora.");
      return;
    }
    const scheduled_at = `${date}T${time}:00`;
    
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
      setFormData({ reason: "", doctor_id: "", clinic_service_id: "" });
      setTime("");
      loadAppointments();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const AppCard = ({ a }) => {
    const cfg = STATUS_LABELS[a.status] || STATUS_LABELS["Agendada"];
    return (
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: "1px solid #e5e7eb", mb: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography fontWeight={700} fontSize={14}>{a.service_name || "Consulta"}</Typography>
            <Typography fontSize={12} color="text.secondary" mt={0.3}>
              {a.scheduled_at ? new Date(a.scheduled_at).toLocaleString("es-MX", { dateStyle: "full", timeStyle: "short" }) : "-"}
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
        <Box><Skeleton height={100} sx={{ mb: 1 }} /><Skeleton height={100} /></Box>
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
            
            <FormControl fullWidth size="small">
              <InputLabel>Doctor</InputLabel>
              <Select
                label="Doctor"
                value={formData.doctor_id}
                onChange={e => setFormData({ ...formData, doctor_id: e.target.value })}
              >
                <MenuItem value=""><em>-- Selecciona un doctor --</em></MenuItem>
                {doctors.map(d => (
                  <MenuItem key={d.id} value={d.id}>Dr(a). {d.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Servicio (Opcional)</InputLabel>
              <Select
                label="Servicio (Opcional)"
                value={formData.clinic_service_id}
                onChange={e => setFormData({ ...formData, clinic_service_id: e.target.value })}
              >
                <MenuItem value=""><em>-- Sin preferencia --</em></MenuItem>
                {services.map(s => (
                  <MenuItem key={s.id} value={s.id}>{s.name} - ${s.price}</MenuItem>
                ))}
                {services.length === 0 && (
                  <MenuItem value="" disabled>No hay servicios registrados</MenuItem>
                )}
              </Select>
            </FormControl>

            <Box sx={{ bgcolor: "#f9fafb", p: 2, borderRadius: 2 }}>
              <TextField
                label="Fecha"
                type="date"
                fullWidth size="small"
                InputLabelProps={{ shrink: true }}
                value={date}
                onChange={e => setDate(e.target.value)}
                sx={{ mb: 2, bgcolor: "white" }}
              />
              
              <Box>
                <Typography fontSize={13} fontWeight={600} mb={1}>
                  Horarios Disponibles {loadingSlots && <CircularProgress size={12} sx={{ ml: 1 }} />}
                </Typography>
                
                {!formData.doctor_id ? (
                  <Typography fontSize={13} color="text.secondary">
                    Por favor, selecciona un doctor para ver sus horarios disponibles.
                  </Typography>
                ) : slots.length > 0 ? (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {slots.map(s => (
                      <Chip 
                        key={s} 
                        label={s} 
                        onClick={() => setTime(s)}
                        color={time === s ? "primary" : "default"}
                        variant={time === s ? "filled" : "outlined"}
                        sx={{ 
                          fontWeight: 600, 
                          bgcolor: time === s ? "#4361ee" : "white",
                          borderColor: time === s ? "#4361ee" : "#d1d5db",
                          "&:hover": { bgcolor: time === s ? "#3251d3" : "#f3f4f6" },
                          cursor: "pointer"
                        }} 
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography fontSize={13} color="text.secondary">
                    {loadingSlots ? "Buscando espacios libres..." : "No hay horarios disponibles para esta fecha."}
                  </Typography>
                )}
              </Box>
            </Box>

            <TextField
              label="Motivo de la cita (Opcional)"
              multiline
              rows={2}
              fullWidth size="small"
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
            disabled={saving || !time}
            sx={{ bgcolor: "#4361ee", "&:hover": { bgcolor: "#3251d3" }, borderRadius: 2 }}
          >
            Confirmar Cita
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
