import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Box, Button, TextField, Typography, Paper, Alert, CircularProgress, InputAdornment, IconButton } from "@mui/material";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { CustomThemeContext } from "../Theme";

const CLINIC_API = import.meta.env.VITE_CLINIC_API_URL || import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

export default function PatientLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ username: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [business, setBusiness] = useState(null);
  const [themeLoading, setThemeLoading] = useState(!!searchParams.get("c"));
  const { setThemeConfig } = useContext(CustomThemeContext);

  useEffect(() => {
    const link = document.getElementById("manifest-link");
    if (link) link.href = "/manifest-patient.json";

    const c = searchParams.get("c");
    if (c) {
      fetch(`${API_URL}/api/v2/businesses/${c}/public`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d) {
            setBusiness(d);
            setThemeConfig({
              primary: d.portal_primary_color || "#121B2B",
              bg: d.portal_bg_color || "#ECECEC",
            });
          }
        })
        .catch(() => {})
        .finally(() => setThemeLoading(false));
    } else {
      setThemeLoading(false);
    }
  }, [searchParams, setThemeConfig]);

  if (themeLoading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", bgcolor: "#f5f5f5" }}>
        <CircularProgress size={48} sx={{ color: "#9ca3af", mb: 2 }} />
        <Typography color="text.secondary">Preparando el portal...</Typography>
      </Box>
    );
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) { setError("Ingresa usuario y contraseña."); return; }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${CLINIC_API}/clinic/patient/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Error al iniciar sesión");
      localStorage.setItem("patient_token", d.access_token);
      localStorage.setItem("patient_claims", JSON.stringify(d.patient));
      
      const c = searchParams.get("c");
      if (c) {
        localStorage.setItem("patient_business_id", c);
      }
      
      navigate("/patient/appointments");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
      <Paper elevation={0} sx={{ width: "100%", maxWidth: 400, p: 4, borderRadius: 3, border: "1px solid #e0e7ff" }}>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5, mb: 3 }}>
          {business?.portal_logo_url ? (
            <img src={business.portal_logo_url} alt="Logo" style={{ height: 60, objectFit: "contain", marginBottom: 8 }} />
          ) : (
            <LocalHospitalIcon sx={{ color: "primary.main", fontSize: 40 }} />
          )}
          <Box textAlign="center">
            <Typography fontWeight={800} fontSize={22} color="primary.main">
              {business?.name || "Zentro Clinic"}
            </Typography>
            <Typography fontSize={12} color="text.secondary">Portal del Paciente</Typography>
          </Box>
        </Box>

        <Typography fontSize={14} color="text.secondary" mb={3}>
          Ingresa con el usuario y contraseña que recibiste por correo.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleLogin} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Usuario (teléfono)"
            size="small"
            fullWidth
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            autoComplete="username"
          />
          <TextField
            label="Contraseña"
            size="small"
            fullWidth
            type={showPass ? "text" : "password"}
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            autoComplete="current-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPass(v => !v)}>
                    {showPass ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <Button type="submit" variant="contained" fullWidth disabled={loading}
            sx={{ borderRadius: 2, fontWeight: 700, py: 1.2 }}>
            {loading ? <CircularProgress size={20} color="inherit" /> : "Entrar"}
          </Button>
        </Box>

        <Box mt={3} textAlign="center">
          <Typography variant="body2" color="text.secondary" mb={1}>
            ¿Eres administrador o staff?
          </Typography>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => navigate("/login")}
            sx={{ py: 1, borderRadius: 2 }}
          >
            Ir a Entrada de Personal
          </Button>
        </Box>

        <Typography fontSize={11} color="text.disabled" textAlign="center" mt={3}>
          Zentro Clinic · Powered by Zentro
        </Typography>
      </Paper>
    </Box>
  );
}
