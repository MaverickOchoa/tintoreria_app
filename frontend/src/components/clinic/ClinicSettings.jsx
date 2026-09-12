import React, { useState, useEffect } from "react";
import { 
  Box, Typography, TextField, Button, Paper, Alert, CircularProgress, 
  Avatar, Grid, Divider
} from "@mui/material";
import { useOutletContext } from "react-router-dom";
import SettingsIcon from "@mui/icons-material/Settings";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

export default function ClinicSettings() {
  const { business, claims } = useOutletContext();
  const [formData, setFormData] = useState({
    portal_primary_color: "#121B2B",
    portal_bg_color: "#ECECEC",
    portal_slogan: "",
    portal_logo_url: ""
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (business) {
      setFormData({
        portal_primary_color: business.portal_primary_color || "#121B2B",
        portal_bg_color: business.portal_bg_color || "#ECECEC",
        portal_slogan: business.portal_slogan || "",
        portal_logo_url: business.portal_logo_url || ""
      });
    }
  }, [business]);

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const token = localStorage.getItem("clinic_token") || localStorage.getItem("access_token");
      const targetBusinessId = business?.id || claims?.business_id;
      if (!targetBusinessId) throw new Error("No se pudo determinar el ID de la clínica.");
      
      // Upload Logo first if present
      let finalLogoUrl = formData.portal_logo_url;
      if (file) {
        const logoData = new FormData();
        logoData.append("file", file);
        const logoRes = await fetch(`${API_BASE_URL}/api/v1/businesses/${targetBusinessId}/logo`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: logoData
        });
        if (!logoRes.ok) throw new Error("Error al subir el logo");
        const logoJson = await logoRes.json();
        finalLogoUrl = logoJson.logo_url;
      }

      // Save Settings
      const payload = {
        portal_primary_color: formData.portal_primary_color,
        portal_bg_color: formData.portal_bg_color,
        portal_slogan: formData.portal_slogan,
        portal_logo_url: finalLogoUrl
      };

      const res = await fetch(`${API_BASE_URL}/api/v1/businesses/${targetBusinessId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Error al guardar configuración");
      
      setMessage("Configuración guardada exitosamente. Recarga la página para aplicar los colores.");
      setFile(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 900, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
        <SettingsIcon sx={{ fontSize: 40, color: "primary.main" }} />
        <Typography variant="h4">Personalización (Whitelabel)</Typography>
      </Box>

      {message && <Alert severity="success" sx={{ mb: 3 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h6" mb={3} fontWeight={700}>Logotipo de la Clínica</Typography>
        <Grid container spacing={4} alignItems="center">
          <Grid item>
            <Avatar 
              src={file ? URL.createObjectURL(file) : formData.portal_logo_url} 
              sx={{ width: 120, height: 120, border: "2px dashed #ccc", bgcolor: "transparent" }}
              variant="rounded"
            >
              {!file && !formData.portal_logo_url && <Typography color="text.secondary">Sin Logo</Typography>}
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Sube tu logotipo. Te recomendamos una imagen cuadrada o rectangular en formato PNG con fondo transparente. 
              Aparecerá en el Portal del Paciente y en tu propio Panel Administrativo.
            </Typography>
            <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />}>
              Elegir Archivo
              <input type="file" hidden accept="image/*" onChange={e => setFile(e.target.files[0])} />
            </Button>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        <Typography variant="h6" mb={3} fontWeight={700}>Colores de la Marca</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField 
              label="Color Principal (Hex)" 
              type="color"
              fullWidth 
              value={formData.portal_primary_color}
              onChange={e => setFormData({ ...formData, portal_primary_color: e.target.value })}
              helperText="Color para los botones principales y el header del menú."
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField 
              label="Color de Fondo (Hex)" 
              type="color"
              fullWidth 
              value={formData.portal_bg_color}
              onChange={e => setFormData({ ...formData, portal_bg_color: e.target.value })}
              helperText="Color para el fondo general del sistema."
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField 
              label="Slogan o Lema (Opcional)" 
              fullWidth 
              value={formData.portal_slogan}
              onChange={e => setFormData({ ...formData, portal_slogan: e.target.value })}
              placeholder="Ej. Tu salud en buenas manos"
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, textAlign: "right" }}>
          <Button 
            variant="contained" 
            size="large"
            disabled={loading}
            onClick={handleSave}
            sx={{ minWidth: 200 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Guardar Cambios"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
