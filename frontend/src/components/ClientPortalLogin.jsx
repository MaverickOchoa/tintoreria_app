import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Paper, Typography, TextField, Button, Alert, CircularProgress,
} from "@mui/material";
import LocalLaundryServiceIcon from "@mui/icons-material/LocalLaundryService";

const API = import.meta.env.VITE_API_URL || API;

export default function ClientPortalLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/v1/client-auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("client_access_token", data.access_token);
        localStorage.setItem("client_info", JSON.stringify({
          full_name: data.full_name,
          client_id: data.client_id,
          business_id: data.business_id,
        }));
        window.location.href = "/#/client-portal/dashboard";
      } else {
        setError(data.message || "Usuario o contraseña incorrectos");
      }
    } catch {
      setError("Error de conexión. Intenta más tarde.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      bgcolor: "background.default", p: 2 }}>
      <Paper elevation={4} sx={{ p: 4, borderRadius: 3, width: "100%", maxWidth: 400 }}>
        <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
          <LocalLaundryServiceIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="h5" fontWeight={700}>Portal del Cliente</Typography>
          <Typography variant="body2" color="text.secondary">
            Consulta tus notas y descuentos
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleLogin}>
          <TextField fullWidth label="Usuario" value={username} onChange={e => setUsername(e.target.value)}
            sx={{ mb: 2 }} required autoFocus />
          <TextField fullWidth label="Contraseña" type="password" value={password}
            onChange={e => setPassword(e.target.value)} sx={{ mb: 3 }} required />
          <Button fullWidth type="submit" variant="contained" size="large" disabled={loading}>
            {loading ? <CircularProgress size={22} color="inherit" /> : "Iniciar Sesión"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
