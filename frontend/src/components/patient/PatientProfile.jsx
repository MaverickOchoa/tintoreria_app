import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Box, Typography, Card, CardContent, TextField, Button, Grid, Avatar
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";
import NotificationsIcon from "@mui/icons-material/Notifications";
import GetAppIcon from "@mui/icons-material/GetApp";
import { CLINIC_API } from "../clinic/clinicTheme";

export default function PatientProfile() {
  const { token, claims } = useOutletContext();
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!password || password.length < 4) {
      alert("La contraseña debe tener al menos 4 caracteres.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`${CLINIC_API}/clinic/patient/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ new_password: password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al cambiar contraseña.");
      setMessage("¡Contraseña actualizada con éxito!");
      setPassword("");
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, maxWidth: 600, mx: "auto" }}>
      <Typography variant="h5" fontWeight={800} color="#1a1a2e" mb={3}>
        Mi Perfil
      </Typography>

      <Card sx={{ mb: 4, borderRadius: 3, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <CardContent sx={{ display: "flex", alignItems: "center", gap: 3, p: 3 }}>
          <Avatar sx={{ width: 64, height: 64, bgcolor: "#4361ee", fontSize: 28 }}>
            {(claims.full_name || "P")[0].toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700} color="#1a1a2e">
              {claims.full_name || "Paciente"}
            </Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
              Usuario: <strong>{claims.username}</strong>
            </Typography>
            {(claims.email || claims.phone) && (
              <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                {claims.email} {claims.email && claims.phone ? " • " : ""} {claims.phone}
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      <Typography variant="h6" fontWeight={700} color="#1a1a2e" mb={2} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <LockIcon color="primary" /> Cambiar Contraseña
      </Typography>
      
      <Card sx={{ borderRadius: 3, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <CardContent sx={{ p: 3 }}>
          <form onSubmit={handleChangePassword}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label="Nueva Contraseña"
                  variant="outlined"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Escribe tu nueva contraseña"
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={saving}
                  sx={{ py: 1.5, bgcolor: "#4361ee", borderRadius: 2, fontWeight: 700 }}
                >
                  {saving ? "Guardando..." : "Actualizar Contraseña"}
                </Button>
                {message && (
                  <Typography color="success.main" textAlign="center" mt={2} fontWeight={600}>
                    {message}
                  </Typography>
                )}
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>

      <Typography variant="h6" fontWeight={700} color="#1a1a2e" mb={2} mt={4} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <NotificationsIcon color="primary" /> App y Notificaciones
      </Typography>

      <Card sx={{ borderRadius: 3, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <CardContent sx={{ p: 3 }}>
          <Typography color="text.secondary" mb={3} fontSize={14}>
            Instala la aplicación en tu celular para tener acceso rápido a tus citas y activa las notificaciones para recibir recordatorios.
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<GetAppIcon />}
                onClick={() => {
                  if (window.pwaPrompt) {
                    window.pwaPrompt.prompt();
                  } else {
                    alert("Para instalar en iOS: Toca el ícono de 'Compartir' y luego 'Agregar a Inicio'.\n\nEn Android, si no aparece el aviso automático, ve al menú de tu navegador y toca 'Instalar aplicación'.");
                  }
                }}
                sx={{ py: 1.5, borderRadius: 2, fontWeight: 700 }}
              >
                Instalar App
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<NotificationsIcon />}
                onClick={async () => {
                  if (!("Notification" in window)) {
                    alert("Este navegador no soporta notificaciones.");
                    return;
                  }
                  if (Notification.permission === "granted") {
                    alert("Las notificaciones ya están activas.");
                  } else if (Notification.permission !== "denied") {
                    const perm = await Notification.requestPermission();
                    if (perm === "granted") {
                      alert("¡Notificaciones activadas!");
                    } else {
                      alert("Permiso denegado.");
                    }
                  } else {
                    alert("Permiso denegado previamente. Debes activarlas desde la configuración de tu navegador.");
                  }
                }}
                sx={{ py: 1.5, borderRadius: 2, fontWeight: 700 }}
              >
                Activar Notificaciones
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

    </Box>
  );
}
