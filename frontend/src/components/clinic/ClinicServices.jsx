import React, { useState, useEffect } from "react";
import {
  Box, Typography, Button, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Switch, FormControlLabel, Chip, CircularProgress, Alert, InputAdornment,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import { CLINIC_API } from "./clinicTheme";

const EMPTY = { name: "", description: "", duration_minutes: 30, price: "", is_active: true };

export default function ClinicServices() {
  const token = localStorage.getItem("access_token");
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const load = () => {
    setLoading(true);
    fetch(`${CLINIC_API}/clinic/services`, { headers })
      .then(r => r.json())
      .then(d => setServices(Array.isArray(d) ? d : []))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(EMPTY); setMsg(null); setDialog(true); };
  const openEdit = (s) => { setEditing(s); setForm({ ...s }); setMsg(null); setDialog(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { setMsg({ type: "error", text: "El nombre es obligatorio." }); return; }
    setSaving(true);
    try {
      const url = editing ? `${CLINIC_API}/clinic/services/${editing.id}` : `${CLINIC_API}/clinic/services`;
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers, body: JSON.stringify({ ...form, price: parseFloat(form.price) || 0 }) });
      if (!res.ok) throw new Error("Error al guardar.");
      setDialog(false);
      load();
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <MedicalServicesIcon sx={{ color: "#4361ee", fontSize: 28 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Servicios / Tratamientos</Typography>
            <Typography variant="body2" color="text.secondary">Catálogo de servicios que ofrece la clínica</Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}
          sx={{ bgcolor: "#4361ee", "&:hover": { bgcolor: "#3451d1" } }}>
          Nuevo Servicio
        </Button>
      </Box>

      <Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={5}><CircularProgress /></Box>
        ) : services.length === 0 ? (
          <Box py={6} textAlign="center">
            <MedicalServicesIcon sx={{ fontSize: 48, color: "#bbb", mb: 1 }} />
            <Typography color="text.secondary">No hay servicios registrados.</Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={openNew} sx={{ mt: 2 }}>
              Agregar primer servicio
            </Button>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8f9fa" }}>
                <TableCell><Typography fontWeight={700} fontSize={12} color="text.secondary">SERVICIO</Typography></TableCell>
                <TableCell><Typography fontWeight={700} fontSize={12} color="text.secondary">DURACIÓN</Typography></TableCell>
                <TableCell><Typography fontWeight={700} fontSize={12} color="text.secondary">PRECIO</Typography></TableCell>
                <TableCell><Typography fontWeight={700} fontSize={12} color="text.secondary">ESTADO</Typography></TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {services.map(s => (
                <TableRow key={s.id} hover>
                  <TableCell>
                    <Typography fontWeight={600}>{s.name}</Typography>
                    {s.description && <Typography variant="caption" color="text.secondary">{s.description}</Typography>}
                  </TableCell>
                  <TableCell>{s.duration_minutes} min</TableCell>
                  <TableCell>${(s.price || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>
                    <Chip label={s.is_active ? "Activo" : "Inactivo"} size="small"
                      color={s.is_active ? "success" : "default"} variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => openEdit(s)}><EditIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          {msg && <Alert severity={msg.type}>{msg.text}</Alert>}
          <TextField label="Nombre del servicio" required fullWidth value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <TextField label="Descripción" fullWidth multiline rows={2} value={form.description || ""}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          <Box display="flex" gap={2}>
            <TextField label="Duración (min)" type="number" fullWidth value={form.duration_minutes}
              onChange={e => setForm(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 30 }))}
              InputProps={{ inputProps: { min: 5, step: 5 } }} />
            <TextField label="Precio" type="number" fullWidth value={form.price}
              onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment>, inputProps: { min: 0 } }} />
          </Box>
          <FormControlLabel
            control={<Switch checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} color="primary" />}
            label="Servicio activo" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            sx={{ bgcolor: "#4361ee", "&:hover": { bgcolor: "#3451d1" } }}>
            {saving ? <CircularProgress size={18} color="inherit" /> : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
