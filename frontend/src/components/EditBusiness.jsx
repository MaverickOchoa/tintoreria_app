import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Container, Box, Typography, Button, Paper, Alert, CircularProgress,
  TextField, Stack, Divider, Grid,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

const EMPTY = {
  name: "", rfc: "", curp: "", sime: "", regimen_fiscal: "",
  street: "", ext_num: "", int_num: "", colonia: "", zip_code: "",
  alcaldia: "", city: "", country: "", phone: "", email: "",
};

export default function EditBusiness() {
  const { businessId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [form, setForm] = useState(EMPTY);

  const token = useMemo(() => localStorage.getItem("access_token"), []);
  const headers = useMemo(() => token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : null, [token]);

  useEffect(() => {
    if (!headers) { navigate("/login"); return; }
    fetch(`${API_BASE_URL}/businesses/${businessId}`, { headers })
      .then(r => r.json())
      .then(d => {
        setForm({
          name: d.name || "", rfc: d.rfc || "", curp: d.curp || "",
          sime: d.sime || "", regimen_fiscal: d.regimen_fiscal || "",
          street: d.street || "", ext_num: d.ext_num || "",
          int_num: d.int_num || "", colonia: d.colonia || "",
          zip_code: d.zip_code || "", alcaldia: d.alcaldia || "",
          city: d.city || "", country: d.country || "",
          phone: d.phone || "", email: d.email || "",
        });
      })
      .catch(() => setError("Error al cargar datos del negocio."))
      .finally(() => setLoading(false));
  }, [businessId, headers, navigate]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("El nombre no puede ir vacío."); return; }
    setSaving(true); setError(""); setOk("");
    try {
      const res = await fetch(`${API_BASE_URL}/businesses/${businessId}`, {
        method: "PUT", headers, body: JSON.stringify(form),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.message || `Error ${res.status}`);
      setOk("Negocio actualizado.");
      setTimeout(() => navigate("/manage-businesses"), 900);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
      <CircularProgress /><Typography sx={{ ml: 2 }}>Cargando...</Typography>
    </Box>
  );

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      <Paper elevation={6} sx={{ p: 3 }}>
        <Stack direction="row" sx={{ mb: 2 }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate("/manage-businesses")}>
            Volver
          </Button>
        </Stack>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>Editar Negocio</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>ID: {businessId}</Typography>
        <Divider sx={{ mb: 2 }} />
        {ok && <Alert severity="success" sx={{ mb: 2 }}>{ok}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSave}>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField fullWidth required label="Nombre del Negocio" value={form.name} onChange={set("name")} disabled={saving} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="RFC" value={form.rfc} onChange={set("rfc")} disabled={saving} inputProps={{ style: { textTransform: "uppercase" } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="CURP" value={form.curp} onChange={set("curp")} disabled={saving} inputProps={{ style: { textTransform: "uppercase" } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="SIME" value={form.sime} onChange={set("sime")} disabled={saving} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth label="Régimen Fiscal" value={form.regimen_fiscal} onChange={set("regimen_fiscal")} disabled={saving} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth label="Calle" value={form.street} onChange={set("street")} disabled={saving} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="Número Exterior" value={form.ext_num} onChange={set("ext_num")} disabled={saving} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="Número Interior" value={form.int_num} onChange={set("int_num")} disabled={saving} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="C.P." value={form.zip_code} onChange={set("zip_code")} disabled={saving} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Colonia" value={form.colonia} onChange={set("colonia")} disabled={saving} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Alcaldía / Municipio" value={form.alcaldia} onChange={set("alcaldia")} disabled={saving} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Ciudad" value={form.city} onChange={set("city")} disabled={saving} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="País" value={form.country} onChange={set("country")} disabled={saving} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Teléfono" value={form.phone} onChange={set("phone")} disabled={saving} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Correo Electrónico" value={form.email} onChange={set("email")} disabled={saving} />
            </Grid>
          </Grid>

          <Button
            type="submit" variant="contained" fullWidth
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            disabled={saving} sx={{ mt: 3, py: 1.2 }}
          >
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
