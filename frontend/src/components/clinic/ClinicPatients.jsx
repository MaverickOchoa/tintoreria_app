import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Avatar, IconButton, Tooltip, Skeleton,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, FormControl, InputLabel,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CloseIcon from "@mui/icons-material/Close";
import { CLINIC_API } from "./clinicTheme";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function getInitials(name = "", last = "") {
  return ((name[0] || "") + (last[0] || "")).toUpperCase() || "?";
}

const EMPTY_FORM = {
  full_name: "", last_name: "", phone: "", email: "",
  birth_date: "", blood_type: "", allergies: "",
  emergency_contact_name: "", emergency_contact_phone: "", notes: "",
};

export default function ClinicPatients() {
  const { token, claims } = useOutletContext();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const load = useCallback(async (s = "") => {
    setLoading(true);
    try {
      const url = `${CLINIC_API}/clinic/patients?limit=60${s ? `&search=${encodeURIComponent(s)}` : ""}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setPatients(Array.isArray(d.patients) ? d.patients : []);
      setTotal(d.total || 0);
    } catch {
      setPatients([]);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setTimeout(() => load(search), 450);
    return () => clearTimeout(t);
  }, [search]);

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = "Requerido";
    if (!form.last_name.trim()) e.last_name = "Requerido";
    if (!form.phone.trim()) e.phone = "Requerido";
    else if (!/^\d{10}$/.test(form.phone.replace(/\s/g, ""))) e.phone = "Debe ser 10 dígitos";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email inválido";
    if (form.emergency_contact_phone && !/^\d{10}$/.test(form.emergency_contact_phone.replace(/\s/g, "")))
      e.emergency_contact_phone = "Debe ser 10 dígitos";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSaving(true);
    try {
      const r = await fetch(`${CLINIC_API}/clinic/patients`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, business_id: claims.business_id }),
      });
      if (r.ok) {
        setOpenModal(false);
        setForm(EMPTY_FORM);
        setErrors({});
        load(search);
      }
    } catch {}
    setSaving(false);
  };

  const handleClose = () => { setOpenModal(false); setForm(EMPTY_FORM); setErrors({}); };
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <Box sx={{
        px: 3, py: 2, bgcolor: "#fff", borderBottom: "1px solid #e8eaed",
        display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap",
      }}>
        <Box>
          <Typography variant="h6" fontWeight={800}>Pacientes</Typography>
          <Typography variant="caption" color="text.secondary">{total} registrados</Typography>
        </Box>
        <TextField
          placeholder="Buscar por nombre o teléfono…"
          size="small"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ ml: "auto", width: 280, bgcolor: "#f8f9fa", borderRadius: 2,
            "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          size="small"
          onClick={() => setOpenModal(true)}
          sx={{ bgcolor: "#4361ee", "&:hover": { bgcolor: "#3251d3" }, borderRadius: 2, fontWeight: 700 }}
        >
          Nuevo Paciente
        </Button>
      </Box>

      {/* Table */}
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: "1px solid #e8eaed" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8f9fa" }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Paciente</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Teléfono</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Tipo sangre</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Alergias</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Contacto emergencia</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right"></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton variant="text" width={j === 0 ? 160 : 80} /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : patients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    {search ? "Sin resultados para esa búsqueda" : "No hay pacientes registrados"}
                  </TableCell>
                </TableRow>
              ) : (
                patients.map(p => (
                  <TableRow
                    key={p.patient_id}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => navigate(`/clinic/patients/${p.patient_id}`)}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: "#4361ee", fontSize: 12 }}>
                          {getInitials(p.full_name, p.last_name)}
                        </Avatar>
                        <Box>
                          <Typography fontSize={13} fontWeight={600}>{p.full_name} {p.last_name || ""}</Typography>
                          <Typography fontSize={11} color="text.secondary">{p.email || ""}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{p.phone || "—"}</TableCell>
                    <TableCell>
                      {p.blood_type
                        ? <Chip label={p.blood_type} size="small" sx={{ bgcolor: "#fdecea", color: "#e63946", fontWeight: 700 }} />
                        : <Typography fontSize={12} color="text.disabled">—</Typography>}
                    </TableCell>
                    <TableCell>
                      {p.allergies
                        ? <Chip label={p.allergies.slice(0, 25) + (p.allergies.length > 25 ? "…" : "")} size="small" color="warning" variant="outlined" />
                        : <Typography fontSize={12} color="text.disabled">Sin registro</Typography>}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {p.emergency_contact_name
                        ? `${p.emergency_contact_name} ${p.emergency_contact_phone ? `· ${p.emergency_contact_phone}` : ""}`
                        : <Typography fontSize={12} color="text.disabled">—</Typography>}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small">
                        <ArrowForwardIosIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* ── MODAL NUEVO PACIENTE ── */}
      <Dialog open={openModal} onClose={handleClose} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, py: 2 }}>
          <Typography fontWeight={800} fontSize={18}>Nuevo Paciente</Typography>
          <IconButton size="small" onClick={handleClose}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>

            {/* ── Datos personales ── */}
            <Box>
              <Typography fontSize={11} fontWeight={700} color="#4361ee" textTransform="uppercase" letterSpacing={1} mb={1.5}>
                Datos personales
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <TextField label="Nombre *" fullWidth size="small" value={form.full_name}
                  onChange={set("full_name")} error={!!errors.full_name} helperText={errors.full_name} />
                <TextField label="Apellido *" fullWidth size="small" value={form.last_name}
                  onChange={set("last_name")} error={!!errors.last_name} helperText={errors.last_name} />
                <TextField label="Teléfono * (10 dígitos)" fullWidth size="small" value={form.phone}
                  onChange={set("phone")} error={!!errors.phone} helperText={errors.phone}
                  inputProps={{ maxLength: 10 }} />
                <TextField label="Email" fullWidth size="small" value={form.email}
                  onChange={set("email")} error={!!errors.email} helperText={errors.email} />
                <TextField label="Fecha de nacimiento" fullWidth size="small" type="date"
                  value={form.birth_date} onChange={set("birth_date")}
                  InputLabelProps={{ shrink: true }} />
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo de sangre</InputLabel>
                  <Select label="Tipo de sangre" value={form.blood_type} onChange={set("blood_type")}>
                    <MenuItem value=""><em>No especificado</em></MenuItem>
                    {BLOOD_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* ── Datos clínicos ── */}
            <Box>
              <Typography fontSize={11} fontWeight={700} color="#4361ee" textTransform="uppercase" letterSpacing={1} mb={1.5}>
                Datos clínicos
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <TextField label="Alergias" fullWidth size="small" value={form.allergies}
                  onChange={set("allergies")} placeholder="Ej: Penicilina, látex…" />
                <TextField label="Notas generales" fullWidth size="small" value={form.notes}
                  onChange={set("notes")} placeholder="Observaciones iniciales…" />
              </Box>
            </Box>

            {/* ── Contacto de emergencia ── */}
            <Box>
              <Typography fontSize={11} fontWeight={700} color="#4361ee" textTransform="uppercase" letterSpacing={1} mb={1.5}>
                Contacto de emergencia
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <TextField label="Nombre del contacto" fullWidth size="small"
                  value={form.emergency_contact_name} onChange={set("emergency_contact_name")} />
                <TextField label="Teléfono (10 dígitos)" fullWidth size="small"
                  value={form.emergency_contact_phone} onChange={set("emergency_contact_phone")}
                  error={!!errors.emergency_contact_phone} helperText={errors.emergency_contact_phone}
                  inputProps={{ maxLength: 10 }} />
              </Box>
            </Box>

          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} sx={{ color: "text.secondary" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            sx={{ bgcolor: "#4361ee", "&:hover": { bgcolor: "#3251d3" }, borderRadius: 2, fontWeight: 700, px: 3 }}>
            {saving ? "Guardando…" : "Crear Paciente"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
