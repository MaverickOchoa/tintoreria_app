import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, TextField, Typography, Paper, Alert, CircularProgress, InputAdornment, IconButton } from "@mui/material";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

const CLINIC_API = import.meta.env.VITE_CLINIC_API_URL || import.meta.env.VITE_API_URL || "";

export default function PatientLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      navigate("/patient/appointments");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
      <Paper elevation={0} sx={{ width: "100%", maxWidth: 400, p: 4, borderRadius: 3, border: "1px solid #e0e7ff" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
          <LocalHospitalIcon sx={{ color: "#4361ee", fontSize: 30 }} />
          <Box>
            <Typography fontWeight={800} fontSize={20} color="#1a1a2e">Zentro Clinic</Typography>
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
            sx={{ bgcolor: "#4361ee", "&:hover": { bgcolor: "#3251d3" }, borderRadius: 2, fontWeight: 700, py: 1.2 }}>
            {loading ? <CircularProgress size={20} color="inherit" /> : "Entrar"}
          </Button>
        </Box>

        <Typography fontSize={11} color="text.disabled" textAlign="center" mt={3}>
          Zentro Clinic · Powered by Zentro
        </Typography>
      </Paper>
    </Box>
  );
}
