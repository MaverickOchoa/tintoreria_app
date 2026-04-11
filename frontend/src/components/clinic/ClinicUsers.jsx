import React, { useState, useEffect } from "react";
import {
  Box, Typography, Button, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Chip, CircularProgress,
  Alert, Avatar, Tooltip, Divider, InputAdornment,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import GroupIcon from "@mui/icons-material/Group";
import EmailIcon from "@mui/icons-material/Email";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

const CLINIC_API = (import.meta.env.VITE_CLINIC_API_URL || "") + "/api/v2";

const ROLES = [
  { value: "Doctor",   label: "Doctor",            color: "#4361ee" },
  { value: "Empleado", label: "Staff / Recepción",  color: "#7209b7" },
  { value: "Gerente",  label: "Administrador",      color: "#f77f00" },
];

const ROLE_COLORS = { Doctor: "#4361ee", Empleado: "#7209b7", Gerente: "#f77f00" };

const toTitle = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const EMPTY_FORM = { full_name: "", last_name: "", phone: "", email: "", role: "Doctor", specialty: "" };

function roleLabel(roles) {
  if (!roles) return "Empleado";
  const arr = Array.isArray(roles) ? roles : [roles];
  if (arr.includes("Gerente") || arr.includes("admin")) return "Gerente";
  if (arr.includes("Doctor") || arr.includes("doctor")) return "Doctor";
  return "Empleado";
}

function roleColor(roles) {
  const lbl = roleLabel(roles);
  return ROLE_COLORS[lbl] || ROLE_COLORS.Empleado;
}

export default function ClinicUsers() {
  const token   = localStorage.getItem("clinic_token") || localStorage.getItem("access_token");
  const claims  = JSON.parse(localStorage.getItem("clinic_claims") || localStorage.getItem("user_claims") || "{}");
  const branchId = localStorage.getItem("branch_id") || claims.branch_id;
  const headers  = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [employees, setEmployees] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [dialog,    setDialog]    = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState(null);

  const load = () => {
    setLoading(true);
    fetch(`${CLINIC_API}/employees`, { headers })
      .then(r => r.json())
      .then(d => setEmployees(Array.isArray(d) ? d : []))
      .catch(() => setEmployees([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew  = () => { setEditing(null); setForm(EMPTY_FORM); setMsg(null); setDialog(true); };
  const openEdit = (emp) => {
    setEditing(emp);
    setForm({
      full_name: emp.full_name || "",
      last_name: emp.last_name || "",
      phone: emp.phone || "",
      email: emp.email || "",
      role: roleLabel(emp.roles),
      specialty: emp.specialty || "",
    });
    setMsg(null);
    setDialog(true);
  };

  const handleField = (field) => (e) => {
    let val = e.target.value;
    if ((field === "full_name" || field === "last_name") && val.length > 0) {
      val = toTitle(val);
    }
    setForm(p => ({ ...p, [field]: val }));
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) { setMsg({ type: "error", text: "El nombre es obligatorio." }); return; }
    if (!editing && !form.email.trim()) { setMsg({ type: "error", text: "El correo es obligatorio para enviar las credenciales." }); return; }
    if (!editing && !form.phone.trim()) { setMsg({ type: "error", text: "El teléfono es obligatorio (se usa como contraseña temporal)." }); return; }
    setSaving(true);
    setMsg(null);
    try {
      let url, method, body;
      if (editing) {
        url    = `${CLINIC_API}/employees/${editing.id}`;
        method = "PUT";
        body   = JSON.stringify({
          full_name:  form.full_name.trim(),
          last_name:  form.last_name.trim() || null,
          phone:      form.phone.trim() || null,
          email:      form.email.trim() || null,
          specialty:  form.specialty.trim() || null,
          role_names: [form.role],
          branch_id:  Number(branchId),
        });
      } else {
        url    = `${CLINIC_API}/employees`;
        method = "POST";
        body   = JSON.stringify({
          full_name:  form.full_name.trim(),
          last_name:  form.last_name.trim() || null,
          phone:      form.phone.trim(),
          email:      form.email.trim(),
          specialty:  form.specialty.trim() || null,
          role_names: [form.role],
          branch_id:  Number(branchId),
        });
      }
      const res  = await fetch(url, { method, headers, body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al guardar.");
      setMsg({ type: "success", text: editing ? "Integrante actualizado." : "Integrante creado. Se enviaron las credenciales por correo." });
      setTimeout(() => { setDialog(false); load(); }, 1200);
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const doctors  = employees.filter(e => roleLabel(e.roles) === "Doctor");
  const staff    = employees.filter(e => roleLabel(e.roles) === "Empleado");
  const managers = employees.filter(e => roleLabel(e.roles) === "Gerente");

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

      <Paper sx={{ borderRadius: 2 }}>
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
                {["NOMBRE", "ROL", "USUARIO", "CONTACTO", ""].map(h => (
                  <TableCell key={h}><Typography fontWeight={700} fontSize={12} color="text.secondary">{h}</Typography></TableCell>
                ))}
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
                        <Typography fontWeight={600} fontSize={14}>
                          {emp.full_name} {emp.last_name || ""}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={roleLabel(emp.roles)} size="small"
                      sx={{ bgcolor: roleColor(emp.roles) + "22", color: roleColor(emp.roles), fontWeight: 600, fontSize: 11 }} />
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? "Editar Integrante" : "Agregar Integrante"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          {msg && <Alert severity={msg.type}>{msg.text}</Alert>}

          {!editing && (
            <Alert severity="info" icon={<InfoOutlinedIcon />}>
              El usuario y contraseña temporal se generarán automáticamente y se enviarán al correo del integrante.
            </Alert>
          )}

          <Box display="flex" gap={2}>
            <TextField label="Nombre(s)" required fullWidth value={form.full_name}
              onChange={handleField("full_name")} />
            <TextField label="Apellido(s)" fullWidth value={form.last_name}
              onChange={handleField("last_name")} />
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

          <TextField label="Especialidad" fullWidth value={form.specialty}
            onChange={handleField("specialty")}
            placeholder="Ej. Odontología General, Pediatría, Fisioterapia..." />

          <Divider />

          <Box display="flex" gap={2}>
            <TextField label="Teléfono" fullWidth value={form.phone}
              onChange={handleField("phone")} required={!editing}
              helperText={!editing ? "Se usará como contraseña temporal" : ""}
              inputProps={{ maxLength: 15 }} />
            <TextField label="Correo electrónico" type="email" fullWidth value={form.email}
              onChange={handleField("email")} required={!editing}
              helperText={!editing ? "Se enviarán las credenciales aquí" : ""}
              InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon fontSize="small" /></InputAdornment> }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            sx={{ bgcolor: "#4361ee", "&:hover": { bgcolor: "#3451d1" } }}>
            {saving ? <CircularProgress size={18} color="inherit" /> : editing ? "Guardar Cambios" : "Crear y Enviar Credenciales"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
