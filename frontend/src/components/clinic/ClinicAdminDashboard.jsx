import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Box, Typography, Paper, Button, TextField, Switch, FormControlLabel,
  Divider, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, Select, FormControl, InputLabel, Alert, Snackbar,
  Accordion, AccordionSummary, AccordionDetails,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EmailIcon from "@mui/icons-material/Email";

const CLINIC_API = import.meta.env.VITE_CLINIC_API_URL || import.meta.env.VITE_API_URL || "";
const FLASK_API = import.meta.env.VITE_API_URL || "";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

const MSG_TRIGGERS = [
  { key: "new_patient", label: "Nuevo paciente registrado", desc: "Se envía cuando se crea un paciente nuevo" },
  { key: "recurring_patient", label: "Paciente recurrente (3+ citas)", desc: "Se envía cuando el paciente llega a su 3ª cita" },
  { key: "appointment_ready", label: "Cita confirmada", desc: "Se envía cuando una cita cambia a Confirmada" },
  { key: "appointment_reminder", label: "Recordatorio 24h antes", desc: "Se envía 24 horas antes de la cita" },
];

export default function ClinicAdminDashboard() {
  const { token, claims, branches, selectedBranch, setSelectedBranch } = useOutletContext();
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });
  const [saving, setSaving] = useState(false);

  // Branch config state
  const [config, setConfig] = useState({
    uses_iva: false, iva_pct: 16,
    payment_cash: true, payment_card: true,
    appointment_duration: 30,
  });

  // Schedule state
  const [schedule, setSchedule] = useState(
    DAYS.map((d, i) => ({ day: i, label: d, active: i < 5, open: "09:00", close: "18:00" }))
  );

  // Promotions state
  const [promos, setPromos] = useState([]);
  const [promoDialog, setPromoDialog] = useState(false);
  const [promoForm, setPromoForm] = useState({ name: "", discount_pct: "", min_orders: "", description: "" });

  // Messages state
  const [messages, setMessages] = useState({});

  const branchId = selectedBranch?.id;

  useEffect(() => {
    if (!branchId) return;
    // Load branch config
    fetch(`${FLASK_API}/branches/${branchId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.id) setConfig({
          uses_iva: !!d.uses_iva,
          iva_pct: d.iva_pct || 16,
          payment_cash: d.payment_cash !== false,
          payment_card: d.payment_card !== false,
          appointment_duration: d.appointment_duration || 30,
        });
      }).catch(() => {});

    // Load schedule
    fetch(`${CLINIC_API}/clinic/schedule?branch_id=${branchId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setSchedule(d); })
      .catch(() => {});

    // Load promotions
    fetch(`${CLINIC_API}/clinic/promotions?branch_id=${branchId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setPromos(Array.isArray(d) ? d : []))
      .catch(() => {});

    // Load messages
    fetch(`${CLINIC_API}/clinic/messages?branch_id=${branchId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d && typeof d === "object") setMessages(d); })
      .catch(() => {});
  }, [branchId]);

  const showSnack = (msg, severity = "success") => setSnack({ open: true, msg, severity });

  const saveConfig = async () => {
    setSaving(true);
    try {
      await fetch(`${FLASK_API}/branches/${branchId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      showSnack("Configuración guardada");
    } catch { showSnack("Error al guardar", "error"); }
    setSaving(false);
  };

  const saveSchedule = async () => {
    setSaving(true);
    try {
      await fetch(`${CLINIC_API}/clinic/schedule`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ branch_id: branchId, schedule }),
      });
      showSnack("Horarios guardados");
    } catch { showSnack("Error al guardar", "error"); }
    setSaving(false);
  };

  const saveMessages = async () => {
    setSaving(true);
    try {
      await fetch(`${CLINIC_API}/clinic/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ branch_id: branchId, messages }),
      });
      showSnack("Mensajes guardados");
    } catch { showSnack("Error al guardar", "error"); }
    setSaving(false);
  };

  const createPromo = async () => {
    try {
      const r = await fetch(`${CLINIC_API}/clinic/promotions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...promoForm, branch_id: branchId }),
      });
      const d = await r.json();
      setPromos(p => [...p, d]);
      setPromoDialog(false);
      setPromoForm({ name: "", discount_pct: "", min_orders: "", description: "" });
      showSnack("Promoción creada");
    } catch { showSnack("Error al crear promoción", "error"); }
  };

  const deletePromo = async (id) => {
    try {
      await fetch(`${CLINIC_API}/clinic/promotions/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      setPromos(p => p.filter(x => x.id !== id));
      showSnack("Promoción eliminada");
    } catch {}
  };

  const setMsg = (trigger, channel, value) =>
    setMessages(m => ({ ...m, [`${trigger}_${channel}`]: value }));

  const SectionTitle = ({ title }) => (
    <Typography fontSize={12} fontWeight={700} color="#4361ee"
      textTransform="uppercase" letterSpacing={1} mb={2}>{title}</Typography>
  );

  if (!branchId) return (
    <Box sx={{ p: 4, textAlign: "center" }}>
      <Typography color="text.secondary">Selecciona una sucursal para configurar.</Typography>
    </Box>
  );

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <SettingsIcon sx={{ color: "#4361ee" }} />
        <Box>
          <Typography variant="h6" fontWeight={800}>Configuración de Sucursal</Typography>
          <Typography fontSize={12} color="text.secondary">{selectedBranch?.name}</Typography>
        </Box>
      </Box>

      {/* ── 1. General ── */}
      <Accordion defaultExpanded elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: "12px !important", mb: 2, "&:before": { display: "none" } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2.5 }}>
          <Typography fontWeight={700}>General — Pagos e IVA</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 2.5, pb: 2.5 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 2 }}>
            <FormControlLabel control={<Switch checked={config.uses_iva} onChange={e => setConfig(c => ({ ...c, uses_iva: e.target.checked }))} />} label="Aplicar IVA" />
            <TextField label="% IVA" size="small" type="number" value={config.iva_pct} disabled={!config.uses_iva}
              onChange={e => setConfig(c => ({ ...c, iva_pct: e.target.value }))} inputProps={{ min: 0, max: 100 }} />
            <FormControlLabel control={<Switch checked={config.payment_cash} onChange={e => setConfig(c => ({ ...c, payment_cash: e.target.checked }))} />} label="Pago en efectivo" />
            <FormControlLabel control={<Switch checked={config.payment_card} onChange={e => setConfig(c => ({ ...c, payment_card: e.target.checked }))} />} label="Pago con tarjeta" />
          </Box>
          <TextField label="Duración de cita por defecto (minutos)" size="small" type="number" value={config.appointment_duration}
            onChange={e => setConfig(c => ({ ...c, appointment_duration: e.target.value }))} inputProps={{ min: 5, step: 5 }} sx={{ width: 280 }} />
          <Box mt={2}><Button variant="contained" size="small" startIcon={<SaveIcon />} onClick={saveConfig} disabled={saving}
            sx={{ bgcolor: "#4361ee", "&:hover": { bgcolor: "#3251d3" }, borderRadius: 2 }}>Guardar</Button></Box>
        </AccordionDetails>
      </Accordion>

      {/* ── 2. Horarios ── */}
      <Accordion elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: "12px !important", mb: 2, "&:before": { display: "none" } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2.5 }}>
          <Typography fontWeight={700}>Horarios de atención</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 2.5, pb: 2.5 }}>
          {schedule.map((s, i) => (
            <Box key={s.day} sx={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr 1fr", alignItems: "center", gap: 2, mb: 1 }}>
              <FormControlLabel
                control={<Switch checked={s.active} size="small" onChange={e => setSchedule(sc => sc.map((x, j) => j === i ? { ...x, active: e.target.checked } : x))} />}
                label={<Typography fontSize={13}>{s.label}</Typography>}
              />
              <TextField select size="small" label="Apertura" value={s.open} disabled={!s.active}
                onChange={e => setSchedule(sc => sc.map((x, j) => j === i ? { ...x, open: e.target.value } : x))}>
                {HOURS.map(h => <MenuItem key={h} value={h}>{h}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Cierre" value={s.close} disabled={!s.active}
                onChange={e => setSchedule(sc => sc.map((x, j) => j === i ? { ...x, close: e.target.value } : x))}>
                {HOURS.map(h => <MenuItem key={h} value={h}>{h}</MenuItem>)}
              </TextField>
              <Chip label={s.active ? "Abierto" : "Cerrado"} size="small"
                sx={{ bgcolor: s.active ? "#ecfdf5" : "#f9fafb", color: s.active ? "#059669" : "#9ca3af", fontWeight: 700 }} />
            </Box>
          ))}
          <Box mt={2}><Button variant="contained" size="small" startIcon={<SaveIcon />} onClick={saveSchedule} disabled={saving}
            sx={{ bgcolor: "#4361ee", "&:hover": { bgcolor: "#3251d3" }, borderRadius: 2 }}>Guardar horarios</Button></Box>
        </AccordionDetails>
      </Accordion>

      {/* ── 3. Promociones ── */}
      <Accordion elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: "12px !important", mb: 2, "&:before": { display: "none" } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2.5 }}>
          <Typography fontWeight={700}>Promociones</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 2.5, pb: 2.5 }}>
          {promos.length === 0 ? (
            <Typography fontSize={13} color="text.secondary" mb={2}>Sin promociones activas para esta sucursal.</Typography>
          ) : promos.map(p => (
            <Box key={p.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, border: "1px solid #e5e7eb", borderRadius: 2, mb: 1 }}>
              <Box>
                <Typography fontWeight={700} fontSize={13}>{p.name}</Typography>
                <Typography fontSize={12} color="text.secondary">{p.description || `${p.discount_pct}% descuento`}</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Chip label={`${p.discount_pct}%`} size="small" sx={{ bgcolor: "#eff2ff", color: "#4361ee", fontWeight: 700 }} />
                <IconButton size="small" onClick={() => deletePromo(p.id)}><DeleteIcon fontSize="small" sx={{ color: "#ef4444" }} /></IconButton>
              </Box>
            </Box>
          ))}
          <Button size="small" startIcon={<AddIcon />} onClick={() => setPromoDialog(true)}
            sx={{ color: "#4361ee", fontWeight: 700 }}>Agregar promoción</Button>
        </AccordionDetails>
      </Accordion>

      {/* ── 4. Mensajes automáticos ── */}
      <Accordion elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: "12px !important", mb: 2, "&:before": { display: "none" } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2.5 }}>
          <Typography fontWeight={700}>Mensajes automáticos</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 2.5, pb: 2.5 }}>
          <Typography fontSize={12} color="text.secondary" mb={2}>
            Personaliza los mensajes que se envían automáticamente a los pacientes. Usa <strong>{"{nombre}"}</strong> para insertar el nombre del paciente.
          </Typography>
          {MSG_TRIGGERS.map(t => (
            <Box key={t.key} sx={{ mb: 3 }}>
              <Typography fontWeight={700} fontSize={13} mb={0.5}>{t.label}</Typography>
              <Typography fontSize={12} color="text.secondary" mb={1}>{t.desc}</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <TextField
                  label={<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><WhatsAppIcon sx={{ fontSize: 15, color: "#25d366" }} /> WhatsApp</Box>}
                  size="small" multiline rows={2} fullWidth
                  value={messages[`${t.key}_whatsapp`] || ""}
                  onChange={e => setMsg(t.key, "whatsapp", e.target.value)}
                  placeholder={`Hola {nombre}, ...`}
                />
                <TextField
                  label={<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><EmailIcon sx={{ fontSize: 15, color: "#4361ee" }} /> Email</Box>}
                  size="small" multiline rows={2} fullWidth
                  value={messages[`${t.key}_email`] || ""}
                  onChange={e => setMsg(t.key, "email", e.target.value)}
                  placeholder={`Hola {nombre}, ...`}
                />
              </Box>
            </Box>
          ))}
          <Button variant="contained" size="small" startIcon={<SaveIcon />} onClick={saveMessages} disabled={saving}
            sx={{ bgcolor: "#4361ee", "&:hover": { bgcolor: "#3251d3" }, borderRadius: 2 }}>Guardar mensajes</Button>
        </AccordionDetails>
      </Accordion>

      {/* Dialog crear promo */}
      <Dialog open={promoDialog} onClose={() => setPromoDialog(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Nueva Promoción</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField label="Nombre *" size="small" fullWidth value={promoForm.name}
              onChange={e => setPromoForm(f => ({ ...f, name: e.target.value }))} />
            <TextField label="% Descuento *" size="small" type="number" fullWidth value={promoForm.discount_pct}
              onChange={e => setPromoForm(f => ({ ...f, discount_pct: e.target.value }))} inputProps={{ min: 1, max: 100 }} />
            <TextField label="Mínimo de citas (opcional)" size="small" type="number" fullWidth value={promoForm.min_orders}
              onChange={e => setPromoForm(f => ({ ...f, min_orders: e.target.value }))} />
            <TextField label="Descripción" size="small" fullWidth value={promoForm.description}
              onChange={e => setPromoForm(f => ({ ...f, description: e.target.value }))} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPromoDialog(false)} sx={{ color: "text.secondary" }}>Cancelar</Button>
          <Button variant="contained" onClick={createPromo}
            sx={{ bgcolor: "#4361ee", "&:hover": { bgcolor: "#3251d3" }, borderRadius: 2, fontWeight: 700 }}>Crear</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snack.severity} sx={{ borderRadius: 2 }}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
