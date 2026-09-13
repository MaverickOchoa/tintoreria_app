import React, { useState, useEffect } from "react";
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, CircularProgress, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Alert,
  Divider, IconButton, Grid, Card, CardContent, Tab, Tabs
} from "@mui/material";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PaymentsIcon from "@mui/icons-material/Payments";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import { CLINIC_API } from "./clinicTheme";

const STATUS_COLORS = {
  "Completada": "success",
  "En Consulta": "warning",
  "Confirmada": "primary",
  "Agendada": "default",
  "Cancelada": "error",
  "No Show": "error",
};
const PAYMENT_METHODS = ["Efectivo", "Tarjeta", "Transferencia", "Puntos"];
const EXPENSE_CATEGORIES = ["Nómina", "Renta", "Servicios (Luz, Agua, etc)", "Insumos Médicos", "Limpieza", "Otro"];

export default function ClinicPayments() {
  const token = localStorage.getItem("access_token");
  const claims = JSON.parse(localStorage.getItem("user_claims") || "{}");
  const role = claims.role;
  
  const [loading, setLoading] = useState(true);
  
  // Date filters (Default to today)
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // Data
  const [summary, setSummary] = useState({ incomes: [], expenses: [], total_income: 0, total_expense: 0, net_balance: 0 });
  const [pendingAppointments, setPendingAppointments] = useState([]);
  
  // Tabs (0 = Pendientes, 1 = Ingresos, 2 = Gastos)
  const [tab, setTab] = useState(0);

  // Dialogs
  const [expenseDialog, setExpenseDialog] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ amount: "", category: "Insumos Médicos", description: "", expense_date: today });
  
  const [payDialog, setPayDialog] = useState(false);
  const [selectedApt, setSelectedApt] = useState(null);
  const [payForm, setPayForm] = useState({ method: "Efectivo", amount: "" });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const loadData = () => {
    setLoading(true);
    // Fetch Summary
    fetch(`${CLINIC_API}/clinic/finance/summary?start_date=${startDate}&end_date=${endDate}`, { headers })
      .then(r => r.json())
      .then(d => {
        setSummary({
          incomes: d.incomes || [],
          expenses: d.expenses || [],
          total_income: d.total_income || 0,
          total_expense: d.total_expense || 0,
          net_balance: d.net_balance || 0
        });
      })
      .catch(console.error);

    // Fetch Appointments for "Citas Pendientes"
    fetch(`${CLINIC_API}/clinic/appointments?date_from=${startDate}&date_to=${endDate}`, { headers })
      .then(r => r.json())
      .then(d => {
        const apts = (d.appointments || []).filter(a => a.status !== "Cancelada" && !a.is_paid);
        setPendingAppointments(apts);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [startDate, endDate]);

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
      const res = await fetch(`${CLINIC_API}/clinic/appointments/${selectedApt.id}/pay`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          amount: parseFloat(payForm.amount),
          payment_method: payForm.method,
          notes: `Consulta: ${selectedApt.service_name || "General"} - ${selectedApt.patient_name}`,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Error al registrar pago.");
      }
      setPayDialog(false);
      loadData();
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveExpense = async () => {
    if (!expenseForm.amount || !expenseForm.description) { 
      setMsg({ type: "error", text: "Monto y descripción son obligatorios." }); 
      return; 
    }
    setSaving(true);
    try {
      const res = await fetch(`${CLINIC_API}/clinic/finance/expenses`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          amount: parseFloat(expenseForm.amount),
          category: expenseForm.category,
          description: expenseForm.description,
          expense_date: expenseForm.expense_date
        }),
      });
      if (!res.ok) throw new Error("Error al registrar gasto.");
      setExpenseDialog(false);
      setExpenseForm({ amount: "", category: "Insumos Médicos", description: "", expense_date: today });
      loadData();
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este gasto?")) return;
    try {
      const res = await fetch(`${CLINIC_API}/clinic/finance/expenses/${id}`, { method: "DELETE", headers });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.detail || "Error al eliminar.");
      }
      loadData();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header & Date Filters */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box sx={{ p: 1, bgcolor: "#2dc653", borderRadius: 2, display: "flex" }}>
            <AccountBalanceWalletIcon sx={{ color: "#fff" }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>Flujo de Caja</Typography>
            <Typography variant="body2" color="text.secondary">Ingresos y Egresos</Typography>
          </Box>
        </Box>
        
        <Box display="flex" gap={2}>
          <TextField 
            type="date" 
            label="Desde" 
            InputLabelProps={{ shrink: true }} 
            size="small"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <TextField 
            type="date" 
            label="Hasta" 
            InputLabelProps={{ shrink: true }} 
            size="small"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, boxShadow: "0 4px 12px rgba(0,0,0,0.03)", borderLeft: "4px solid #2dc653" }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2" fontWeight={600} display="flex" alignItems="center" gap={1}>
                <TrendingUpIcon color="success" fontSize="small" /> Entradas (Cobrado)
              </Typography>
              <Typography variant="h4" fontWeight={800} mt={1} color="#2dc653">
                ${summary.total_income.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, boxShadow: "0 4px 12px rgba(0,0,0,0.03)", borderLeft: "4px solid #f94144" }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2" fontWeight={600} display="flex" alignItems="center" gap={1}>
                <TrendingDownIcon color="error" fontSize="small" /> Salidas (Gastos)
              </Typography>
              <Typography variant="h4" fontWeight={800} mt={1} color="#f94144">
                ${summary.total_expense.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, boxShadow: "0 4px 12px rgba(0,0,0,0.03)", borderLeft: "4px solid #4361ee" }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2" fontWeight={600} display="flex" alignItems="center" gap={1}>
                <AccountBalanceWalletIcon color="primary" fontSize="small" /> Balance Neto
              </Typography>
              <Typography variant="h4" fontWeight={800} mt={1} color={summary.net_balance >= 0 ? "#4361ee" : "#f94144"}>
                ${summary.net_balance.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 2 }}>
          <Tabs value={tab} onChange={(e, v) => setTab(v)}>
            <Tab label={`Por Cobrar (${pendingAppointments.length})`} />
            <Tab label={`Ingresos (${summary.incomes.length})`} />
            <Tab label={`Gastos (${summary.expenses.length})`} />
          </Tabs>
          {tab === 2 && (
            <Button variant="contained" size="small" onClick={() => { setMsg(null); setExpenseDialog(true); }}>
              + Registrar Gasto
            </Button>
          )}
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={5}><CircularProgress /></Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8f9fa" }}>
                {tab === 0 ? (
                  <>
                    <TableCell><Typography fontWeight={700} fontSize={12} color="text.secondary">PACIENTE</Typography></TableCell>
                    <TableCell><Typography fontWeight={700} fontSize={12} color="text.secondary">SERVICIO</Typography></TableCell>
                    <TableCell><Typography fontWeight={700} fontSize={12} color="text.secondary">HORA</Typography></TableCell>
                    <TableCell><Typography fontWeight={700} fontSize={12} color="text.secondary">ESTATUS</Typography></TableCell>
                    <TableCell align="right"><Typography fontWeight={700} fontSize={12} color="text.secondary">ACCIÓN</Typography></TableCell>
                  </>
                ) : (
                  <>
                    <TableCell><Typography fontWeight={700} fontSize={12} color="text.secondary">FECHA</Typography></TableCell>
                    <TableCell><Typography fontWeight={700} fontSize={12} color="text.secondary">CONCEPTO / DESCRIPCIÓN</Typography></TableCell>
                    <TableCell><Typography fontWeight={700} fontSize={12} color="text.secondary">CATEGORÍA</Typography></TableCell>
                    <TableCell align="right"><Typography fontWeight={700} fontSize={12} color="text.secondary">MONTO</Typography></TableCell>
                    {tab === 2 && <TableCell align="right"><Typography fontWeight={700} fontSize={12} color="text.secondary">ACCIÓN</Typography></TableCell>}
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {tab === 0 ? (
                pendingAppointments.length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>No hay citas pendientes de cobro.</TableCell></TableRow>
                ) : (
                  pendingAppointments.map(apt => (
                    <TableRow key={apt.id} hover>
                      <TableCell><Typography fontWeight={600}>{apt.patient_name}</Typography></TableCell>
                      <TableCell>{apt.service_name || "General"}</TableCell>
                      <TableCell>{new Date(apt.scheduled_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</TableCell>
                      <TableCell>
                        <Chip label={apt.status} size="small" color={STATUS_COLORS[apt.status] || "default"} variant="outlined" />
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" variant="contained" onClick={() => openPay(apt)}
                          sx={{ bgcolor: "#2dc653", "&:hover": { bgcolor: "#25a244" } }}>
                          Cobrar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )
              ) : tab === 1 ? (
                summary.incomes.length === 0 ? (
                  <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}>No hay ingresos en este periodo.</TableCell></TableRow>
                ) : (
                  summary.incomes.map(inc => (
                    <TableRow key={inc.id} hover>
                      <TableCell>{new Date(inc.date).toLocaleDateString("es-MX", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</TableCell>
                      <TableCell><Typography fontWeight={600}>{inc.description}</Typography></TableCell>
                      <TableCell><Chip label={inc.category} size="small" variant="outlined" /></TableCell>
                      <TableCell align="right"><Typography fontWeight={700} color="#2dc653">+ ${inc.amount.toFixed(2)}</Typography></TableCell>
                    </TableRow>
                  ))
                )
              ) : (
                summary.expenses.length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>No hay gastos registrados en este periodo.</TableCell></TableRow>
                ) : (
                  summary.expenses.map(exp => (
                    <TableRow key={exp.id} hover>
                      <TableCell>{new Date(exp.date).toLocaleDateString("es-MX", { day: '2-digit', month: 'short' })}</TableCell>
                      <TableCell><Typography fontWeight={600}>{exp.description}</Typography></TableCell>
                      <TableCell><Chip label={exp.category} size="small" variant="outlined" color="error" /></TableCell>
                      <TableCell align="right"><Typography fontWeight={700} color="#f94144">- ${exp.amount.toFixed(2)}</Typography></TableCell>
                      <TableCell align="right">
                        {(role === "admin" || role === "owner" || role === "Gerente") ? (
                          <IconButton size="small" color="error" onClick={() => handleDeleteExpense(exp.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        ) : (
                          <Typography variant="caption" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Dialog Gasto */}
      <Dialog open={expenseDialog} onClose={() => setExpenseDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Nuevo Gasto</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {msg && <Alert severity={msg.type} sx={{ mb: 2 }}>{msg.text}</Alert>}
          
          <Box display="flex" gap={2} mb={2} mt={1}>
            <TextField 
              label="Monto ($)" type="number" fullWidth value={expenseForm.amount}
              onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))}
              InputProps={{ inputProps: { min: 0, step: "0.01" } }} 
            />
            <TextField 
              type="date" label="Fecha" fullWidth 
              InputLabelProps={{ shrink: true }}
              value={expenseForm.expense_date}
              onChange={e => setExpenseForm(p => ({ ...p, expense_date: e.target.value }))}
            />
          </Box>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Categoría</InputLabel>
            <Select 
              label="Categoría" value={expenseForm.category}
              onChange={e => setExpenseForm(p => ({ ...p, category: e.target.value }))}>
              {EXPENSE_CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField 
            label="Descripción o Concepto" fullWidth multiline rows={2}
            value={expenseForm.description}
            onChange={e => setExpenseForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Ej. Compra de 50 jeringas y guantes"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setExpenseDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveExpense} disabled={saving}>
            {saving ? <CircularProgress size={18} color="inherit" /> : "Guardar Gasto"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Cobro (Existente) */}
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
