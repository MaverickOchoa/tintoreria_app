import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box, Paper, Typography, TextField, Button, Alert, CircularProgress,
} from "@mui/material";
import LocalLaundryServiceIcon from "@mui/icons-material/LocalLaundryService";
import { CustomThemeContext } from "./Theme";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

export default function ClientPortalLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [business, setBusiness] = useState(null);
  const [themeLoading, setThemeLoading] = useState(!!searchParams.get("c"));
  const { setThemeConfig } = useContext(CustomThemeContext);

  useEffect(() => {
    const c = searchParams.get("c");
    const link = document.getElementById("manifest-link");
    if (link) {
      if (c) {
        link.href = `${API}/businesses/${c}/manifest.json`;
      } else {
        link.href = "/manifest-patient.json";
      }
    }

    if (c) {
      fetch(`${API}/businesses/${c}/public`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d) {
            setBusiness(d);
            setThemeConfig({
              primary: d.portal_primary_color || "#1976d2",
              bg: d.portal_bg_color || "#f5f5f5",
            });
          }
        })
        .catch(() => {})
        .finally(() => setThemeLoading(false));
    } else {
      setThemeLoading(false);
    }
  }, [searchParams, setThemeConfig]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/client-auth/login`, {
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
        setError(data.message || "Usuario o contrasea incorrectos");
      }
    } catch {
      setError("Error de conexin. Intenta mǭs tarde.");
    } finally {
      setLoading(false);
    }
  };

  if (themeLoading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", bgcolor: "background.default" }}>
        <CircularProgress size={48} sx={{ color: "#9ca3af", mb: 2 }} />
        <Typography color="text.secondary">Preparando el portal...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      bgcolor: "background.default", p: 2 }}>
      <Paper elevation={4} sx={{ p: 4, borderRadius: 3, width: "100%", maxWidth: 400 }}>
        <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
          {business?.portal_logo_url ? (
            <img 
              src={business.portal_logo_url} 
              alt={business.name || "Logo"} 
              style={{ width: 120, height: 120, objectFit: "contain", marginBottom: 8 }} 
            />
          ) : (
            <LocalLaundryServiceIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
          )}
          <Typography variant="h5" fontWeight={700}>
            {business?.name ? `Portal ${business.name}` : "Portal del Cliente"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {business?.portal_slogan || "Consulta tus notas y descuentos"}
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleLogin}>
          <TextField fullWidth label="Usuario" value={username} onChange={e => setUsername(e.target.value)}
            sx={{ mb: 2 }} required autoFocus />
          <TextField fullWidth label="Contrasea" type="password" value={password}
            onChange={e => setPassword(e.target.value)} sx={{ mb: 3 }} required />
          <Button fullWidth type="submit" variant="contained" size="large" disabled={loading}>
            {loading ? <CircularProgress size={22} color="inherit" /> : "Iniciar Sesin"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
