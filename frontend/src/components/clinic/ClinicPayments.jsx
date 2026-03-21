import React, { useState, useEffect } from "react";
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, CircularProgress, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Alert,
  Divider, IconButton,
} from "@mui/material";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PaymentsIcon from "@mui/icons-material/Payments";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { CLINIC_API } from "./clinicTheme";

const API = import.meta.env.VITE_API_URL || "";
const STATUS_COLORS = {
  "Completada": "success",
  "En Consulta": "warning",
  "Confirmada": "primary",
  "Agendada": "default",
  "Cancelada": "error",
  "No Show": "error",
};
const PAYMENT_METHODS = ["Efectivo", "Tarjeta", "Transferencia", "Puntos"];

export default function ClinicPayments() {
  const token = localStorage.getItem("access_token");
  const claims = JSON.parse(localStorage.getItem("user_claims") || "{}");
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payDialog, setPayDialog] = useState(false);
  const [selectedApt, setSelectedApt] = useState(null);
  const [payForm, setPayForm] = useState({ method: "Efectivo", amount: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const load = () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    fetch(`${CLINIC_API}/clinic/appointments?date_from=${today}&date_to=${today}`, { headers })
      .then(r => r.json())
      .then(d => setAppointments((d.appointments || []).filter(a => a.status !== "Cancelada")))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openPay = (apt) => {
    setSelectedApt(apt);
    setPayForm({ method: "Efectivo", amount: apt.price || "" });
    setMsg(null);
    setPayDialog(true);
  };

  const handlePay = async () => {
    if (!payForm.amount) { setMsg({ type: "error", text: "Ingresa el monto cobrado." }); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/payments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          appointment_id: selectedApt.id,
          branch_id: selectedApt.branch_id,
          business_id: selectedApt.business_id,
          amount: parseFloat(payForm.amount),
          payment_method: payForm.method,
          notes: `Consulta: ${selectedApt.service_name || "General"} — ${selectedApt.patient_name}`,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Error al registrar pago.");
      }
      await fetch(`${CLINIC_API}/clinic/appointments/${selectedApt.id}`, {
        method: "PUT", headers,
        body: JSON.stringify({ status: "Completada" }),
      });
      setPayDialog(false);
      load();
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const total = appointments.filter(a => a.status === "Completada").length;

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box sx={{ p: 1, bgcolor: "#2dc653", borderRadius: 2, display: "flex" }}>
            <PaymentsIcon sx={{ color: "#fff" }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>Caja del Día</Typography>
            <Typography variant="body2" color="text.secondary">
              Cobros de hoy · {total} completadas
            </Typography>
          </Box>
        </Box>
      </Box>

      <Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={5}><CircularProgress /></Box>
        ) : appointments.length === 0 ? (
          <Box py={6} textAlign="center">
            <ReceiptLongIcon sx={{ fontSize: 48, color: "#bbb", mb: 1 }} />
            <Typography color="text.secondary">No hay citas programadas para hoy.</Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8f9fa" }}>
                <TableCell><Typography fontWeight={700} fontSize={12} color="text.secondary">PACIENTE</Typography></TableCell>
                <TableCell><Typography fontWeight={700} fontSize={12} color="text.secondary">SERVICIO</Typography></TableCell>
                <TableCell><Typography fontWeight={700} fontSize={12} color="text.secondary">DOCTOR</Typography></TableCell>
                <TableCell><Typography fontWeight={700} fontSize={12} color="text.secondary">HORA</Typography></TableCell>
                <TableCell><Typography fontWeight={700} fontSize={12} color="text.secondary">ESTATUS</Typography></TableCell>
                <TableCell><Typography fontWeight={700} fontSize={12} color="text.secondary">ACCIÓN</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {appointments.map(apt => (
                <TableRow key={apt.id} hover>
                  <TableCell><Typography fontWeight={600}>{apt.patient_name}</Typography></TableCell>
                  <TableCell>{apt.service_name || "General"}</TableCell>
                  <TableCell>{apt.doctor_name ? `Dr. ${apt.doctor_name}` : "—"}</TableCell>
                  <TableCell>{new Date(apt.scheduled_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</TableCell>
                  <TableCell>
                    <Chip label={apt.status} size="small" color={STATUS_COLORS[apt.status] || "default"} variant="outlined" />
                  </TableCell>
                  <TableCell>
                    {apt.status === "Completada" ? (
                      <Chip icon={<CheckCircleIcon />} label="Cobrado" size="small" color="success" />
                    ) : (
                      <Button size="small" variant="contained" onClick={() => openPay(apt)}
                        sx={{ bgcolor: "#2dc653", "&:hover": { bgcolor: "#25a244" } }}>
                        Cobrar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={payDialog} onClose={() => setPayDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Registrar Cobro</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {msg && <Alert severity={msg.type} sx={{ mb: 2 }}>{msg.text}</Alert>}
          {selectedApt && (
            <Box mb={2}>
              <Typography fontWeight={700}>{selectedApt.patient_name}</Typography>
              <Typography variant="body2" color="text.secondary">{selectedApt.service_name || "Consulta general"}</Typography>
              <Divider sx={{ my: 1 }} />
            </Box>
          )}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Método de pago</InputLabel>
            <Select label="Método de pago" value={payForm.method}
              onChange={e => setPayForm(p => ({ ...p, method: e.target.value }))}>
              {PAYMENT_METHODS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Monto cobrado ($)" type="number" fullWidth value={payForm.amount}
            onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
            InputProps={{ inputProps: { min: 0 } }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handlePay} disabled={saving}
            sx={{ bgcolor: "#2dc653", "&:hover": { bgcolor: "#25a244" } }}>
            {saving ? <CircularProgress size={18} color="inherit" /> : "Confirmar Cobro"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
