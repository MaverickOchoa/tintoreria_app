import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Paper, Typography, TextField, Button, Grid,
  Divider, Alert, CircularProgress, Snackbar,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import BusinessIcon from "@mui/icons-material/Business";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

const emptyForm = {
  name: "", phone: "", email: "",
  rfc: "", curp: "", sime: "",
  street: "", ext_num: "", int_num: "",
  colonia: "", zip_code: "", alcaldia: "", city: "",
  regimen_fiscal: "",
  country: "México",
};

export default function BusinessInfo() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");
  const claims = JSON.parse(localStorage.getItem("user_claims") || "{}");
  const businessId = claims.business_id;

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    fetch(`${API}/businesses/${businessId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        setForm({
          name: d.name || "",
          phone: d.phone || "",
          email: d.email || "",
          rfc: d.rfc || "",
          curp: d.curp || "",
          sime: d.sime || "",
          street: d.street || "",
          ext_num: d.ext_num || "",
          int_num: d.int_num || "",
          colonia: d.colonia || "",
          zip_code: d.zip_code || "",
          alcaldia: d.alcaldia || "",
          city: d.city || "",
          regimen_fiscal: d.regimen_fiscal || "",
          country: d.country || "México",
        });
      })
      .catch(() => setError("Error al cargar información del negocio"))
      .finally(() => setLoading(false));
  }, [businessId]);

  const handleChange = (field) => (e) => {
    setForm(p => ({ ...p, [field]: e.target.value }));
  };

  const handleCapitalize = (field) => (e) => {
    const val = e.target.value.replace(/\b\w/g, c => c.toUpperCase());
    setForm(p => ({ ...p, [field]: val }));
  };

  const handleUpper = (field) => (e) => {
    setForm(p => ({ ...p, [field]: e.target.value.toUpperCase() }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/businesses/${businessId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, address: `${form.street} ${form.ext_num}` }),
      });
      if (res.status === 401 || res.status === 422) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_claims");
        navigate("/login");
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.message || "Error al guardar");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", p: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 860, mx: "auto" }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/business-admin-dashboard")} sx={{ mb: 2 }}>
          Regresar al Dashboard
        </Button>

        <Paper elevation={4} sx={{ p: { xs: 2, md: 4 }, borderRadius: 3 }}>
          <Box display="flex" alignItems="center" gap={1.5} mb={1}>
            <BusinessIcon color="primary" fontSize="large" />
            <Typography variant="h5" fontWeight={700}>Información del Negocio</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Esta información aparecerá en las notas y documentos fiscales.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {/* DATOS GENERALES */}
          <Typography variant="subtitle1" fontWeight={600} mb={1}>Datos Generales</Typography>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Nombre del Negocio" value={form.name}
                onChange={handleCapitalize("name")} required />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth label="Teléfono" value={form.phone}
                onChange={handleChange("phone")} inputProps={{ maxLength: 20 }} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth label="Correo Electrónico" value={form.email}
                onChange={handleChange("email")} type="email" />
            </Grid>
          </Grid>

          <Divider sx={{ mb: 3 }} />

          {/* DATOS FISCALES */}
          <Typography variant="subtitle1" fontWeight={600} mb={1}>Datos Fiscales</Typography>
          <Grid container spacing={2} mb={2}>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="RFC" value={form.rfc}
                onChange={handleUpper("rfc")} inputProps={{ maxLength: 13 }}
                helperText="Ej. XAXX010101000" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="CURP" value={form.curp}
                onChange={handleUpper("curp")} inputProps={{ maxLength: 18 }}
                helperText="Ej. XEXX010101HNEXXXA4" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="SIME" value={form.sime}
                onChange={handleChange("sime")} inputProps={{ maxLength: 50 }} />
            </Grid>
          </Grid>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12}>
              <TextField fullWidth label="Régimen Fiscal" value={form.regimen_fiscal}
                onChange={handleChange("regimen_fiscal")} inputProps={{ maxLength: 150 }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="País" value={form.country}
                onChange={handleChange("country")} inputProps={{ maxLength: 60 }} />
            </Grid>
          </Grid>

          <Divider sx={{ mb: 3 }} />

          {/* DIRECCIÓN */}
          <Typography variant="subtitle1" fontWeight={600} mb={1}>Dirección del Negocio</Typography>
          <Grid container spacing={2} mb={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="Calle" value={form.street}
                onChange={handleCapitalize("street")} />
            </Grid>
          </Grid>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={2}>
              <TextField fullWidth label="Núm. Exterior" value={form.ext_num}
                onChange={handleChange("ext_num")} />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField fullWidth label="Núm. Interior" value={form.int_num}
                onChange={handleChange("int_num")} helperText="Opcional" />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField fullWidth label="C.P." value={form.zip_code}
                onChange={handleChange("zip_code")} inputProps={{ maxLength: 5 }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Colonia" value={form.colonia}
                onChange={handleCapitalize("colonia")} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Alcaldía / Municipio" value={form.alcaldia}
                onChange={handleCapitalize("alcaldia")} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Ciudad" value={form.city}
                onChange={handleCapitalize("city")} />
            </Grid>
          </Grid>

          <Box display="flex" justifyContent="flex-end" gap={2} mt={1}>
            <Button variant="outlined" onClick={() => navigate("/business-admin-dashboard")}>
              Cancelar
            </Button>
            <Button
              variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={handleSave} disabled={saving || !form.name}
            >
              Guardar Información
            </Button>
          </Box>
        </Paper>
      </Box>

      <Snackbar open={success} autoHideDuration={3000} onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity="success" onClose={() => setSuccess(false)}>
          Información guardada correctamente
        </Alert>
      </Snackbar>
    </Box>
  );
}
