import React, { useState, useEffect } from "react";
import {
  Box, Typography, Button, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Chip, CircularProgress,
  Alert, Avatar, Tooltip, Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import GroupIcon from "@mui/icons-material/Group";
import LockResetIcon from "@mui/icons-material/LockReset";

const API = import.meta.env.VITE_API_URL || "";

const ROLES = [
  { value: "doctor",     label: "Doctor",         color: "#4361ee" },
  { value: "staff",      label: "Staff / Recepción", color: "#7209b7" },
  { value: "admin",      label: "Administrador",   color: "#f77f00" },
];

const ROLE_COLORS = { doctor: "#4361ee", staff: "#7209b7", admin: "#f77f00", Gerente: "#f77f00" };

const EMPTY_FORM = {
  full_name: "", last_name: "", phone: "", email: "",
  username: "", password: "", role: "doctor", specialty: "",
};

function roleLabel(roles) {
  if (!roles) return "Staff";
  if (Array.isArray(roles)) {
    if (roles.includes("Gerente") || roles.includes("admin")) return "Administrador";
    if (roles.includes("doctor") || roles.includes("Doctor")) return "Doctor";
    return "Staff";
  }
  return roles;
}

function roleColor(roles) {
  const label = roleLabel(roles);
  if (label === "Administrador") return ROLE_COLORS.admin;
  if (label === "Doctor") return ROLE_COLORS.doctor;
  return ROLE_COLORS.staff;
}

export default function ClinicUsers() {
  const token = localStorage.getItem("access_token");
  const claims = JSON.parse(localStorage.getItem("user_claims") || "{}");
  const branchId = localStorage.getItem("branch_id") || claims.branch_id;
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [pwDialog, setPwDialog] = useState(false);
  const [pwTarget, setPwTarget] = useState(null);
  const [newPw, setNewPw] = useState("");

  const load = () => {
    setLoading(true);
    fetch(`${API}/employees?business_id=${claims.business_id}`, { headers })
      .then(r => r.json())
      .then(d => setEmployees(Array.isArray(d.employees) ? d.employees : []))
      .catch(() => setEmployees([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setMsg(null); setDialog(true); };
  const openEdit = (emp) => {
    setEditing(emp);
    setForm({
      full_name: emp.full_name || "", last_name: emp.last_name || "",
      phone: emp.phone || "", email: emp.email || "",
      username: emp.username || "", password: "",
      role: emp.roles?.includes("Gerente") ? "admin" : emp.roles?.includes("Doctor") ? "doctor" : "staff",
      specialty: emp.specialty || "",
    });
    setMsg(null);
    setDialog(true);
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) { setMsg({ type: "error", text: "El nombre es obligatorio." }); return; }
    if (!editing && !form.username.trim()) { setMsg({ type: "error", text: "El usuario es obligatorio." }); return; }
    if (!editing && !form.password.trim()) { setMsg({ type: "error", text: "La contraseña es obligatoria." }); return; }
    setSaving(true);
    try {
      const roleMap = { doctor: "Doctor", staff: "Empleado", admin: "Gerente" };
      const payload = {
        full_name: form.full_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        username: form.username.trim(),
        role: roleMap[form.role] || "Empleado",
        specialty: form.specialty.trim(),
        business_id: claims.business_id,
        branch_id: branchId,
        ...(form.password ? { password: form.password } : {}),
      };
      const url = editing ? `${API}/employees/${editing.id}` : `${API}/employees`;
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al guardar.");
      setDialog(false);
      load();
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleResetPw = async () => {
    if (!newPw.trim() || newPw.length < 6) { return; }
    try {
      const res = await fetch(`${API}/employees/${pwTarget.id}/password`, {
        method: "PUT", headers, body: JSON.stringify({ password: newPw }),
      });
      if (!res.ok) throw new Error("Error al cambiar contraseña.");
      setPwDialog(false); setNewPw("");
    } catch (e) { alert(e.message); }
  };

  const doctors = employees.filter(e => e.roles?.includes("Doctor") || e.role === "doctor");
  const staff = employees.filter(e => !e.roles?.includes("Doctor") && !e.roles?.includes("Gerente"));
  const managers = employees.filter(e => e.roles?.includes("Gerente") || e.role === "admin");

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box sx={{ p: 1, bgcolor: "#4361ee", borderRadius: 2, display: "flex" }}>
            <GroupIcon sx={{ color: "#fff" }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>Equipo</Typography>
            <Typography variant="body2" color="text.secondary">
              {doctors.length} doctores · {staff.length} staff · {managers.length} administradores
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}
          sx={{ bgcolor: "#4361ee", "&:hover": { bgcolor: "#3451d1" } }}>
          Agregar Integrante
        </Button>
      </Box>

      <Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={5}><CircularProgress /></Box>
        ) : employees.length === 0 ? (
          <Box py={6} textAlign="center">
            <GroupIcon sx={{ fontSize: 48, color: "#bbb", mb: 1 }} />
            <Typography color="text.secondary">No hay integrantes del equipo registrados.</Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={openNew} sx={{ mt: 2 }}>
              Agregar primero
            </Button>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8f9fa" }}>
                <TableCell><Typography fontWeight={700} fontSize={12} color="text.secondary">NOMBRE</Typography></TableCell>
                <TableCell><Typography fontWeight={700} fontSize={12} color="text.secondary">ROL</Typography></TableCell>
                <TableCell><Typography fontWeight={700} fontSize={12} color="text.secondary">ESPECIALIDAD</Typography></TableCell>
                <TableCell><Typography fontWeight={700} fontSize={12} color="text.secondary">USUARIO</Typography></TableCell>
                <TableCell><Typography fontWeight={700} fontSize={12} color="text.secondary">CONTACTO</Typography></TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.map(emp => (
                <TableRow key={emp.id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: roleColor(emp.roles), fontSize: 13 }}>
                        {(emp.full_name || "?")[0].toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography fontWeight={600} fontSize={14}>{emp.full_name} {emp.last_name || ""}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={roleLabel(emp.roles)} size="small"
                      sx={{ bgcolor: roleColor(emp.roles) + "22", color: roleColor(emp.roles), fontWeight: 600, fontSize: 11 }} />
                  </TableCell>
                  <TableCell>
                    <Typography fontSize={13} color="text.secondary">{emp.specialty || "—"}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontSize={12} fontFamily="monospace">{emp.username || "—"}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontSize={12}>{emp.phone || ""}</Typography>
                    <Typography fontSize={11} color="text.secondary">{emp.email || ""}</Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => openEdit(emp)}><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Cambiar contraseña">
                      <IconButton size="small" onClick={() => { setPwTarget(emp); setNewPw(""); setPwDialog(true); }}>
                        <LockResetIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Dialog crear/editar */}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? "Editar Integrante" : "Agregar Integrante"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          {msg && <Alert severity={msg.type}>{msg.text}</Alert>}
          <Box display="flex" gap={2}>
            <TextField label="Nombre(s)" required fullWidth value={form.full_name}
              onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
            <TextField label="Apellido(s)" fullWidth value={form.last_name}
              onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} />
          </Box>
          <FormControl fullWidth required>
            <InputLabel>Rol</InputLabel>
            <Select label="Rol" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              {ROLES.map(r => (
                <MenuItem key={r.value} value={r.value}>
                  <Chip label={r.label} size="small" sx={{ bgcolor: r.color + "22", color: r.color, mr: 1 }} />
                  {r.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {form.role === "doctor" && (
            <TextField label="Especialidad" fullWidth value={form.specialty}
              onChange={e => setForm(p => ({ ...p, specialty: e.target.value }))}
              placeholder="Ej. Medicina General, Odontología, Fisioterapia" />
          )}
          <Divider />
          <Box display="flex" gap={2}>
            <TextField label="Teléfono" fullWidth value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              inputProps={{ maxLength: 10 }} />
            <TextField label="Email" type="email" fullWidth value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </Box>
          <Divider />
          <Typography variant="caption" color="text.secondary" fontWeight={600}>ACCESO AL SISTEMA</Typography>
          <Box display="flex" gap={2}>
            <TextField label="Usuario" required={!editing} fullWidth value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              disabled={!!editing} helperText={editing ? "No se puede cambiar el usuario" : ""} />
            <TextField label={editing ? "Nueva contraseña (opcional)" : "Contraseña"} type="password"
              required={!editing} fullWidth value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              helperText={editing ? "Dejar vacío para no cambiar" : "Mínimo 6 caracteres"} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            sx={{ bgcolor: "#4361ee", "&:hover": { bgcolor: "#3451d1" } }}>
            {saving ? <CircularProgress size={18} color="inherit" /> : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog cambiar contraseña */}
      <Dialog open={pwDialog} onClose={() => setPwDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cambiar Contraseña — {pwTarget?.full_name}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField label="Nueva contraseña" type="password" fullWidth value={newPw}
            onChange={e => setNewPw(e.target.value)} helperText="Mínimo 6 caracteres" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPwDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleResetPw} disabled={newPw.length < 6}
            sx={{ bgcolor: "#4361ee" }}>
            Actualizar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
