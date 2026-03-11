import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Stack, Chip, IconButton,
  Alert, CircularProgress, Box, Divider,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

const API = import.meta.env.VITE_API_URL || API;

export default function ClientDiscountsModal({ open, onClose, client, token }) {
  const [discounts, setDiscounts] = useState([]);
  const [pct, setPct] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (open && client?.id) loadDiscounts();
  }, [open, client]);

  const loadDiscounts = () => {
    fetch(`${API}/api/v1/clients/${client.id}/discounts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setDiscounts(d.discounts || []))
      .catch(() => {});
  };

  const handleAdd = async () => {
    if (!pct || parseFloat(pct) <= 0) { setMsg({ type: "error", text: "Ingresa un % válido (1-100)" }); return; }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`${API}/api/v1/clients/${client.id}/discounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ discount_pct: parseFloat(pct), reason: reason.trim() || null }),
      });
      const d = await res.json();
      if (res.ok) { setPct(""); setReason(""); loadDiscounts(); setMsg({ type: "success", text: "Descuento agregado" }); }
      else setMsg({ type: "error", text: d.message || "Error" });
    } catch { setMsg({ type: "error", text: "Error de conexión" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/api/v1/clients/${client?.id}/discounts/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    loadDiscounts();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Descuentos — {client?.full_name} {client?.last_name || ""}
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Agrega descuentos personalizados para este cliente. El cliente los verá en su portal.
        </Typography>

        <Box display="flex" gap={1} mb={1} flexWrap="wrap">
          <TextField size="small" label="Descuento %" type="number" value={pct}
            onChange={e => setPct(e.target.value)} inputProps={{ min: 1, max: 100 }} sx={{ width: 110 }} />
          <TextField size="small" label="Motivo (opcional)" value={reason}
            onChange={e => setReason(e.target.value)} sx={{ flex: 1, minWidth: 150 }} />
          <Button variant="contained" size="small"
            startIcon={saving ? <CircularProgress size={12} color="inherit" /> : <AddIcon />}
            onClick={handleAdd} disabled={saving}>
            Agregar
          </Button>
        </Box>

        {msg && <Alert severity={msg.type} sx={{ mb: 1, py: 0.2 }}>{msg.text}</Alert>}

        <Divider sx={{ my: 2 }} />

        {discounts.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Sin descuentos asignados.</Typography>
        ) : (
          <Stack spacing={1}>
            {discounts.map(d => (
              <Box key={d.id} display="flex" justifyContent="space-between" alignItems="center"
                sx={{ p: 1, borderRadius: 1, bgcolor: "action.hover" }}>
                <Box>
                  <Chip label={`${d.discount_pct}%`} size="small" color="primary" sx={{ mr: 1 }} />
                  <Typography variant="body2" component="span" color="text.secondary">
                    {d.reason || "Sin motivo"}
                  </Typography>
                </Box>
                <IconButton size="small" color="error" onClick={() => handleDelete(d.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
