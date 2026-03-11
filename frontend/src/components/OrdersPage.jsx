import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container, Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, CircularProgress,
  Alert, TextField, InputAdornment, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, Snackbar, Tooltip, FormControl,
  InputLabel, Select, MenuItem,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import PaymentIcon from "@mui/icons-material/Payment";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CancelIcon from "@mui/icons-material/Cancel";

const API = import.meta.env.VITE_API_URL || API;
const getClaims = () => { try { return JSON.parse(localStorage.getItem("user_claims") || "{}"); } catch { return {}; } };

const STATUS_COLORS = {
  "Pendiente": "default",
  "En Proceso": "info",
  "En Producción": "warning",
  "Listo": "success",
  "Entregado": "primary",
  "Cancelado": "error",
};

const MANAGER_ROLES = new Set(["business_admin", "branch_manager"]);

const OrdersPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");
  const claims = getClaims();
  const isManager = MANAGER_ROLES.has(claims.role);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [successMsg, setSuccessMsg] = useState(null);

  const [bizConfig, setBizConfig] = useState({
    payment_cash: true, payment_card: true, payment_points: false,
    allow_deferred: true, peso_per_point: 1,
  });

  // --- Deliver modal ---
  const [deliverOrder, setDeliverOrder] = useState(null);
  const [deliverInputs, setDeliverInputs] = useState({ cash: "", card: "", points: "" });
  const [delivering, setDelivering] = useState(false);

  // --- Cancel modal ---
  const [cancelOrder, setCancelOrder] = useState(null);
  const [cancelAuth, setCancelAuth] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/orders`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setOrders(data.orders || []);
      else setError(data.message || "Error al cargar órdenes.");
    } catch { setError("Error de conexión."); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadOrders();
    if (claims.business_id) {
      fetch(`${API}/businesses/${claims.business_id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => setBizConfig({
          payment_cash: d.payment_cash ?? true,
          payment_card: d.payment_card ?? true,
          payment_points: d.payment_points ?? false,
          allow_deferred: d.allow_deferred ?? true,
          peso_per_point: d.peso_per_point ?? 1,
        }))
        .catch(console.error);
    }
  }, [token]);

  // --- Deliver ---
  const openDeliverModal = (order) => {
    setDeliverOrder(order);
    setDeliverInputs({ cash: "", card: "", points: "" });
  };

  const deliverBalance = deliverOrder
    ? Math.max(0, parseFloat(deliverOrder.total_amount) - parseFloat(deliverOrder.amount_paid || 0))
    : 0;

  const handleDeliver = async () => {
    const cashAmt = parseFloat(deliverInputs.cash || "0");
    const cardAmt = parseFloat(deliverInputs.card || "0");
    const ptsAmt  = parseFloat(deliverInputs.points || "0");
    const ptsVal  = ptsAmt * bizConfig.peso_per_point;
    const payments = [];
    if (cashAmt > 0) payments.push({ method: "cash", amount: cashAmt });
    if (cardAmt > 0) payments.push({ method: "card", amount: cardAmt });
    if (ptsAmt  > 0) payments.push({ method: "points", amount: ptsVal });
    if (deliverBalance > 0 && payments.length === 0) {
      setError("Debes registrar el pago para entregar."); return;
    }
    setDelivering(true);
    try {
      const res = await fetch(`${API}/api/v1/orders/${deliverOrder.id}/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ payments }),
      });
      const d = await res.json();
      if (res.ok) {
        setSuccessMsg("¡Orden entregada!");
        setDeliverOrder(null);
        loadOrders();
      } else setError(d.message || "Error al entregar la orden.");
    } catch { setError("Error de conexión."); }
    finally { setDelivering(false); }
  };

  // --- Cancel ---
  const openCancelModal = (order) => {
    setCancelOrder(order);
    setCancelAuth("");
    setCancelError(null);
  };

  const handleCancel = async () => {
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`${API}/api/v1/orders/${cancelOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "Cancelado", cancel_auth_code: cancelAuth }),
      });
      const d = await res.json();
      if (res.ok) {
        setSuccessMsg("Orden cancelada.");
        setCancelOrder(null);
        loadOrders();
      } else setCancelError(d.message || "Código incorrecto.");
    } catch { setCancelError("Error de conexión."); }
    finally { setCancelling(false); }
  };

  const filteredOrders = orders.filter((o) => {
    const term = searchTerm.toLowerCase();
    return (
      o.id.toString().includes(term) ||
      (o.folio || "").toLowerCase().includes(term) ||
      (o.client_name || "").toLowerCase().includes(term) ||
      o.status.toLowerCase().includes(term)
    );
  });

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" fontWeight="bold" color="primary">Órdenes</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/clients")}>
          Nueva Orden
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField fullWidth variant="outlined" placeholder="Buscar por folio, cliente o estado..."
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          size="small"
        />
      </Box>

      {loading ? (
        <Box textAlign="center" py={4}><CircularProgress /></Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
<TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: "#f5f5f5" }}>
              <TableRow>
                <TableCell><strong>Folio</strong></TableCell>
                <TableCell><strong>Cliente</strong></TableCell>
                <TableCell><strong>Creado por</strong></TableCell>
                <TableCell><strong>Fecha</strong></TableCell>
                <TableCell><strong>Entrega</strong></TableCell>
                <TableCell><strong>Entregado</strong></TableCell>
                <TableCell><strong>Total</strong></TableCell>
                <TableCell><strong>Pago</strong></TableCell>
                <TableCell><strong>Estado</strong></TableCell>
                <TableCell><strong>Carrusel</strong></TableCell>
                <TableCell align="center"><strong>Acciones</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map(order => {
                  const remaining = Math.max(0, parseFloat(order.total_amount) - parseFloat(order.amount_paid || 0));
                  const canDeliver = order.status === "Listo";
                  const canCancel = isManager && order.status !== "Entregado" && order.status !== "Cancelado";
                  return (
                    <TableRow key={order.id} hover>
                      <TableCell sx={{ fontWeight: 600, fontFamily: "monospace" }}>{order.folio || `#${order.id}`}</TableCell>
                      <TableCell>{order.client_name || "—"}</TableCell>
                      <TableCell sx={{ fontSize: "12px", color: "text.secondary" }}>{order.created_by_name || "—"}</TableCell>
                      <TableCell>{new Date(order.order_date).toLocaleDateString("es-MX")}</TableCell>
                      <TableCell sx={{ fontSize: "12px" }}>
                        {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString("es-MX") : "—"}
                      </TableCell>
                      <TableCell sx={{ fontSize: "12px", color: order.delivered_at ? "success.main" : "text.disabled" }}>
                        {order.delivered_at ? new Date(order.delivered_at).toLocaleDateString("es-MX") : "—"}
                      </TableCell>
                      <TableCell>${parseFloat(order.total_amount).toFixed(2)}</TableCell>
                      <TableCell>
                        {order.payment_status === "paid"
                          ? <Chip label="Pagado" color="success" size="small" />
                          : order.payment_status === "partial"
                          ? <Chip label={`Pend. $${remaining.toFixed(2)}`} color="warning" size="small" />
                          : <Chip label={`Pend. $${remaining.toFixed(2)}`} color="error" size="small" />
                        }
                      </TableCell>
                      <TableCell>
                        <Chip label={order.status} color={STATUS_COLORS[order.status] || "default"} size="small" />
                      </TableCell>
                      <TableCell sx={{ fontSize: "12px", fontFamily: "monospace" }}>
                        {order.carousel_position || "—"}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Ver detalle">
                          <IconButton size="small" color="primary" onClick={() => navigate(`/orders/${order.id}`)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {canDeliver && (
                          <Tooltip title="Entregar orden">
                            <IconButton size="small" color="success" onClick={() => openDeliverModal(order)}>
                              <LocalShippingIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canCancel && (
                          <Tooltip title="Cancelar orden">
                            <IconButton size="small" color="error" onClick={() => openCancelModal(order)}>
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 3 }}>No se encontraron órdenes.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ENTREGAR MODAL */}
      <Dialog open={!!deliverOrder} onClose={() => setDeliverOrder(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Entregar orden {deliverOrder?.folio}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            {deliverBalance > 0 ? (
              <>
                <Alert severity="warning">Saldo pendiente: <strong>${deliverBalance.toFixed(2)}</strong></Alert>
                {bizConfig.payment_cash && (
                  <TextField label="Efectivo ($)" type="number" size="small" fullWidth
                    value={deliverInputs.cash}
                    onChange={e => setDeliverInputs(p => ({ ...p, cash: e.target.value }))}
                  />
                )}
                {bizConfig.payment_card && (
                  <TextField label="Tarjeta ($)" type="number" size="small" fullWidth
                    value={deliverInputs.card}
                    onChange={e => setDeliverInputs(p => ({ ...p, card: e.target.value }))}
                  />
                )}
              </>
            ) : (
              <Alert severity="success">Orden pagada en su totalidad. Se marcará como entregada.</Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeliverOrder(null)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleDeliver} disabled={delivering}>
            {delivering ? <CircularProgress size={18} /> : "Confirmar entrega"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* CANCELAR MODAL */}
      <Dialog open={!!cancelOrder} onClose={() => setCancelOrder(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancelar orden {cancelOrder?.folio}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Alert severity="warning">
              Esta acción requiere autorización. Ingresa la contraseña del gerente o dueño.
            </Alert>
            <TextField
              label="Código de autorización"
              type="password"
              size="small"
              fullWidth
              value={cancelAuth}
              onChange={e => setCancelAuth(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCancel(); }}
            />
            {cancelError && <Alert severity="error">{cancelError}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOrder(null)}>Cerrar</Button>
          <Button variant="contained" color="error" onClick={handleCancel} disabled={cancelling || !cancelAuth}>
            {cancelling ? <CircularProgress size={18} /> : "Cancelar orden"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!error} autoHideDuration={5000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      </Snackbar>
      <Snackbar open={!!successMsg} autoHideDuration={4000} onClose={() => setSuccessMsg(null)}>
        <Alert severity="success" onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>
      </Snackbar>
    </Container>
  );
};

export default OrdersPage;
