import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toTitleCase } from "../utils";
import {
  Box, Typography, Button, Paper, TextField, Alert,
  CircularProgress, Container, Checkbox, FormControlLabel,
  FormGroup, MenuItem, Select, FormControl, InputLabel,
} from "@mui/material";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

const getClaims = () => {
  const raw = localStorage.getItem("user_claims");
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
};

const EmployeeForm = () => {
  const navigate = useNavigate();
  const claims = getClaims();
  const role = claims.role;
  const businessId = claims.business_id;

  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
    branch_id: "",
    role_ids: [],
  });

  useEffect(() => {
    if (!role) { navigate("/login"); return; }
    if (!["business_admin", "branch_manager"].includes(role)) navigate("/login");
  }, [role, navigate]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token || !businessId) { navigate("/login"); return; }

    const fetchData = async () => {
      try {
        const [branchRes, roleRes] = await Promise.all([
          fetch(`${API_BASE_URL}/businesses/${businessId}/branches`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/roles`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const branchData = await branchRes.json();
        const roleData = await roleRes.json();
        if (branchRes.ok) setBranches(branchData.branches || []);
        if (roleRes.ok) {
          const systemRoles = ["business_admin", "super_admin", "cliente", "empleado"];
          const excluded = role === "branch_manager" ? [...systemRoles, "Gerente"] : systemRoles;
          setRoles((roleData.roles || []).filter(r => !excluded.includes(r.name)));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [businessId, navigate]);

  const handleRoleToggle = (roleId) => {
    setFormData((prev) => ({
      ...prev,
      role_ids: prev.role_ids.includes(roleId)
        ? prev.role_ids.filter((id) => id !== roleId)
        : [...prev.role_ids, roleId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.username.trim()) { setError("El nombre de usuario es requerido."); return; }
    if (!formData.password.trim()) { setError("La contraseña es requerida."); return; }
    if (!formData.first_name.trim()) { setError("El nombre es requerido."); return; }
    if (!formData.branch_id) { setError("Debes seleccionar una sucursal."); return; }
    if (formData.role_ids.length === 0) { setError("Debes asignar al menos un rol."); return; }

    setIsSubmitting(true);
    const token = localStorage.getItem("access_token");
    if (!token) { navigate("/login"); return; }

    const payload = {
      base_username: formData.username,
      password: formData.password,
      full_name: `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim(),
      phone: formData.phone,
      branch_id: parseInt(formData.branch_id),
      role_ids: formData.role_ids,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al crear usuario");
      alert("Usuario creado correctamente.");
      navigate(-1);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}><CircularProgress /></Box>;

  const selectedBranchName = branches.find(b => b.id === formData.branch_id)?.name;

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ mb: 3 }}>Crear Usuario</Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth required label="Nombre de usuario" sx={{ mb: 1 }}
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value.trim() })}
          />
          {formData.username && selectedBranchName && (
            <Box sx={{ mb: 2, px: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Usuario final: <strong>{formData.username}@{selectedBranchName}</strong>
              </Typography>
            </Box>
          )}

          <TextField
            fullWidth required type="password" label="Contraseña" sx={{ mb: 2 }}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />

          <TextField
            fullWidth required label="Nombre(s)" sx={{ mb: 2 }}
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: toTitleCase(e.target.value) })}
          />

          <TextField
            fullWidth label="Apellido(s)" sx={{ mb: 2 }}
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: toTitleCase(e.target.value) })}
          />

          <TextField
            fullWidth label="Teléfono" sx={{ mb: 2 }}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />

          <FormControl fullWidth sx={{ mb: 2 }} required>
            <InputLabel>Sucursal</InputLabel>
            <Select
              value={formData.branch_id}
              onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
              label="Sucursal"
            >
              {branches.map((b) => (
                <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {roles.length > 0 && (
            <Box sx={{ mb: 2, p: 1.5, border: formData.role_ids.length === 0 ? "1px solid #f44336" : "1px solid #e0e0e0", borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: formData.role_ids.length === 0 ? "error.main" : "text.primary" }}>
                Rol *
              </Typography>
              <FormGroup>
                {roles.map((r) => (
                  <FormControlLabel
                    key={r.id}
                    control={
                      <Checkbox
                        checked={formData.role_ids.includes(r.id)}
                        onChange={() => handleRoleToggle(r.id)}
                      />
                    }
                    label={r.name}
                  />
                ))}
              </FormGroup>
              {formData.role_ids.length === 0 && (
                <Typography variant="caption" color="error">Selecciona al menos un rol</Typography>
              )}
            </Box>
          )}

          <Button fullWidth type="submit" variant="contained" sx={{ mt: 2 }} disabled={isSubmitting}>
            {isSubmitting ? "Creando..." : "Crear Usuario"}
          </Button>

          <Button fullWidth variant="text" sx={{ mt: 1 }} onClick={() => navigate(-1)}>
            Cancelar
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default EmployeeForm;
