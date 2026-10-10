import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Button, TextField, MenuItem, Typography,
  Autocomplete, CircularProgress, Alert, IconButton,
  Chip
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { CLINIC_API } from "./clinicTheme";

const FLASK_API = import.meta.env.VITE_CLINIC_API_URL || import.meta.env.VITE_API_URL || "";

export default function ClinicNewAppointment({ open, onClose, onCreated, token, claims }) {
  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [branches, setBranches] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [loadingPatients, setLoadingPatients] = useState(false);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [form, setForm] = useState({
    patient_id: "",
    doctor_id: "",
    clinic_service_id: "",
    branch_id: claims.branch_id || "",
    duration_minutes: 30,
    reason: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    fetch(`${CLINIC_API}/clinic/services`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setServices(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${FLASK_API}/employees?role=doctor&branch_id=${claims.branch_id || ""}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setDoctors(Array.isArray(d) ? d : ((Array.isArray(d) ? d : (d.employees || []))))).catch(() => {});
    fetch(`${FLASK_API}/businesses/${claims.business_id}/branches`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setBranches((Array.isArray(d) ? d : (d.branches || [])))).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!patientSearch || patientSearch.length < 2) { setPatients([]); return; }
    setLoadingPatients(true);
    const timer = setTimeout(() => {
      fetch(`${CLINIC_API}/clinic/patients?search=${encodeURIComponent(patientSearch)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(d => setPatients(Array.isArray(d.patients) ? d.patients : []))
        .catch(() => setPatients([]))
        .finally(() => setLoadingPatients(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  useEffect(() => {
    if (!form.doctor_id || !form.branch_id || !date) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    fetch(`${CLINIC_API}/clinic/doctors/${form.doctor_id}/available-slots?branch_id=${form.branch_id}&date=${date}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        setSlots((Array.isArray(d) ? d : (d.slots || [])));
        if (d.slots && !d.slots.includes(time)) setTime(""); // Reset time if not available
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [form.doctor_id, form.branch_id, date]);

  // When service changes, update duration
  useEffect(() => {
    if (form.clinic_service_id) {
      const srv = services.find(s => s.id === form.clinic_service_id);
      if (srv && srv.duration_minutes) {
        setF("duration_minutes", srv.duration_minutes);
      }
    }
  }, [form.clinic_service_id, services]);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.patient_id || !form.branch_id || !date || !time) {
      setError("Paciente, sucursal, fecha y hora son requeridos.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const scheduled_at = `${date}T${time}:00`;
      const r = await fetch(`${CLINIC_API}/clinic/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          patient_id: Number(form.patient_id),
          doctor_id: form.doctor_id ? Number(form.doctor_id) : null,
          clinic_service_id: form.clinic_service_id ? Number(form.clinic_service_id) : null,
          branch_id: Number(form.branch_id),
          duration_minutes: Number(form.duration_minutes),
          scheduled_at
        }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail || "Error"); }
      const apt = await r.json();
      onCreated(apt);
    } catch (e) {
      setError(e.message || "Error al crear la cita");
    }
    setSaving(false);
  };

  const handleClose = () => { setError(null); onClose(); };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, py: 2 }}>
        <Typography fontWeight={800} fontSize={18}>Nueva Cita</Typography>
        <IconButton size="small" onClick={handleClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>

          <Box>
            <Typography fontSize={11} fontWeight={700} color="#4361ee" textTransform="uppercase" letterSpacing={1} mb={1.5}>
              Paciente
            </Typography>
            <Autocomplete
              options={patients}
              getOptionLabel={p => `${p.full_name || ""} ${p.last_name || ""} - ${p.phone || ""}`.trim()}
              loading={loadingPatients}
              onInputChange={(_, v) => setPatientSearch(v)}
              onChange={(_, p) => setF("patient_id", p?.patient_id || "")}
              noOptionsText={patientSearch.length < 2 ? "Escribe al menos 2 caracteres" : "Sin resultados"}
              renderInput={params => (
                <TextField {...params} label="Buscar paciente *" size="small" fullWidth
                  placeholder="Nombre o teléfono..."
                  InputProps={{ ...params.InputProps, endAdornment: (<>{loadingPatients && <CircularProgress size={16} />}{params.InputProps.endAdornment}</>) }}
                />
              )}
            />
          </Box>

          <Box>
            <Typography fontSize={11} fontWeight={700} color="#4361ee" textTransform="uppercase" letterSpacing={1} mb={1.5}>
              Detalles de la cita
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <TextField select fullWidth size="small" label="Sucursal *" value={form.branch_id}
                onChange={e => setF("branch_id", e.target.value)}>
                {branches.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </TextField>
              <TextField select fullWidth size="small" label="Doctor (opcional)" value={form.doctor_id}
                onChange={e => setF("doctor_id", e.target.value)}>
                <MenuItem value="">Sin asignar</MenuItem>
                {doctors.map(d => <MenuItem key={d.id} value={d.id}>{d.full_name}</MenuItem>)}
              </TextField>
              <TextField select fullWidth size="small" label="Servicio (opcional)" value={form.clinic_service_id}
                onChange={e => setF("clinic_service_id", e.target.value)}>
                <MenuItem value="">Sin especificar</MenuItem>
                {services.map(s => <MenuItem key={s.id} value={s.id}>{s.name}{s.duration_minutes ? ` (${s.duration_minutes} min)` : ""}</MenuItem>)}
              </TextField>
              <TextField fullWidth size="small" label="Duración (minutos)" type="number" value={form.duration_minutes}
                onChange={e => setF("duration_minutes", e.target.value)} inputProps={{ min: 5, step: 5 }} />
              
              <TextField fullWidth size="small" label="Motivo de consulta" value={form.reason}
                onChange={e => setF("reason", e.target.value)} />
            </Box>
          </Box>
          
          <Box>
            <Typography fontSize={11} fontWeight={700} color="#4361ee" textTransform="uppercase" letterSpacing={1} mb={1.5}>
              Fecha y Hora
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr", gap: 2, bgcolor: "#f9fafb", p: 2, borderRadius: 2 }}>
              <TextField 
                fullWidth size="small" label="Fecha *" type="date" value={date}
                onChange={e => setDate(e.target.value)}
                InputLabelProps={{ shrink: true }} sx={{ bgcolor: "white" }} 
              />
              
              <Box>
                <Typography fontSize={13} fontWeight={600} mb={1}>
                  Horarios Disponibles {loadingSlots && <CircularProgress size={12} sx={{ ml: 1 }} />}
                </Typography>
                {!form.doctor_id ? (
                  <TextField 
                    size="small" label="Hora *" type="time" value={time}
                    onChange={e => setTime(e.target.value)}
                    InputLabelProps={{ shrink: true }} sx={{ bgcolor: "white", width: 200 }} 
                  />
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
                    {loadingSlots ? "Cargando espacios..." : "No hay horarios disponibles para esta fecha."}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

          <Box>
            <Typography fontSize={11} fontWeight={700} color="#4361ee" textTransform="uppercase" letterSpacing={1} mb={1.5}>
              Notas adicionales
            </Typography>
            <TextField fullWidth size="small" multiline minRows={2} value={form.notes}
              onChange={e => setF("notes", e.target.value)}
              placeholder="Observaciones, instrucciones previas..." />
          </Box>

        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={saving} sx={{ color: "text.secondary" }}>Cancelar</Button>
        <Button variant="contained" disabled={saving || (!form.doctor_id ? !time : false)} onClick={handleSubmit}
          sx={{ bgcolor: "#4361ee", "&:hover": { bgcolor: "#3251d3" }, fontWeight: 700, borderRadius: 2, px: 3 }}>
          {saving ? <CircularProgress size={18} color="inherit" /> : "Crear Cita"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
