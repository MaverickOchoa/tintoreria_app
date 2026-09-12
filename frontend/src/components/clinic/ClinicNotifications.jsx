import React, { useState } from "react";
import {
  Box, Typography, Card, CardContent, TextField, Button, Alert, CircularProgress
} from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import SendIcon from "@mui/icons-material/Send";
import { useOutletContext } from "react-router-dom";
import { CLINIC_API } from "./clinicTheme";

export default function ClinicNotifications() {
  const { token } = useOutletContext();
  const [formData, setFormData] = useState({ title: "", body: "", url: "/#/patient" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.body) {
      setMsg({ type: "error", text: "Ttulo y mensaje son obligatorios." });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`${CLINIC_API}/clinic/admin/push-send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer "
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al enviar notificacin");
      setMsg({ type: "success", text: data.message || "Notificacin enviada con xito." });
      setFormData({ title: "", body: "", url: "/#/patient" });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <NotificationsActiveIcon sx={{ color: "#4361ee", fontSize: 32 }} />
        <Typography variant="h5" fontWeight={800}>Enviar Notificaciones Push</Typography>
      </Box>

      <Card sx={{ borderRadius: 3, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <CardContent sx={{ p: 3 }}>
          <Typography color="text.secondary" mb={3} fontSize={14}>
            Enva una notificacin emergente a los pacientes que tengan la App instalada y las notificaciones activas.
          </Typography>

          {msg && (
            <Alert severity={msg.type} sx={{ mb: 3 }}>{msg.text}</Alert>
          )}

          <form onSubmit={handleSend}>
            <TextField
              fullWidth
              label="Ttulo del Mensaje"
              variant="outlined"
              sx={{ mb: 2 }}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ej. Promocin del Mes"
              required
            />
            <TextField
              fullWidth
              label="Cuerpo del Mensaje"
              variant="outlined"
              multiline
              rows={3}
              sx={{ mb: 2 }}
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="Escribe tu mensaje aqu..."
              required
            />
            
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
              sx={{ py: 1.5, bgcolor: "#4361ee", borderRadius: 2, fontWeight: 700 }}
            >
              {loading ? "Enviando..." : "Enviar a Todos"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
