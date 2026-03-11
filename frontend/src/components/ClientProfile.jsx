import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Paper, Typography, Divider, CircularProgress, Alert,
  Button, Grid, Chip, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Collapse,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import LockIcon from "@mui/icons-material/Lock";

const API = import.meta.env.VITE_API_URL || API;
const getToken = () => localStorage.getItem("access_token");
const getClaims = () => { try { return JSON.parse(localStorage.getItem("user_claims") || "{}"); } catch { return {}; } };

const MONTHS = ["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const STATUS_COLORS = {
  "Pendiente": "warning", "En Proceso": "info", "En Producción": "primary",
  "Listo": "success", "Entregado": "default", "Cancelado": "error",
};

function OrderRow({ order }) {
  const [open, setOpen] = useState(false);
  const fmt = (d) => d ? new Date(d).toLocaleDateString("es-MX") : "—";
  return (
    <>
      <TableRow hover sx={{ cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
        <TableCell>{order.folio || order.id}</TableCell>
        <TableCell>{fmt(order.order_date)}</TableCell>
        <TableCell>{fmt(order.delivery_date)}</TableCell>
        <TableCell>{fmt(order.delivered_at)}</TableCell>
        <TableCell>
          <Chip label={order.status} color={STATUS_COLORS[order.status] || "default"} size="small" />
        </TableCell>
        <TableCell align="right">${parseFloat(order.total_amount || 0).toFixed(2)}</TableCell>
        <TableCell>{open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
          <Collapse in={open} unmountOnExit>
            <Box sx={{ p: 2, bgcolor: "#fafafa" }}>
              {order.items && order.items.length > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Prenda / Artículo</TableCell>
                      <TableCell align="center">Cant.</TableCell>
                      <TableCell align="right">Precio unit.</TableCell>
                      <TableCell align="right">Total línea</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.items.map((it, i) => (
                      <TableRow key={i}>
                        <TableCell>{it.product_name || it.item_name || "—"}</TableCell>
                        <TableCell align="center">{it.quantity}</TableCell>
                        <TableCell align="right">${parseFloat(it.unit_price || it.price || 0).toFixed(2)}</TableCell>
                        <TableCell align="right">${parseFloat(it.line_total || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="text.secondary">Sin detalle disponible</Typography>
              )}
              <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.25 }}>
                <Typography variant="body2">Subtotal: ${parseFloat(order.subtotal || 0).toFixed(2)}</Typography>
                {parseFloat(order.discount || 0) > 0 && (
                  <Typography variant="body2" color="success.main">Descuento: -${parseFloat(order.discount).toFixed(2)}</Typography>
                )}
                {parseFloat(order.tax || 0) > 0 && (
                  <Typography variant="body2">IVA: ${parseFloat(order.tax).toFixed(2)}</Typography>
                )}
                <Typography variant="body2" fontWeight="bold">Total: ${parseFloat(order.total_amount || 0).toFixed(2)}</Typography>
                <Chip size="small" sx={{ mt: 0.5 }}
                  label={order.payment_status === "paid" ? "Pagado" : order.payment_status === "partial" ? "Pago parcial" : "Pendiente"}
                  color={order.payment_status === "paid" ? "success" : order.payment_status === "partial" ? "warning" : "error"}
                />
                {order.promo_name && (
                  <Typography variant="body2" color="success.main">
                    Promo: {order.promo_name} — Ahorraste ${parseFloat(order.promo_discount || 0).toFixed(2)}
                  </Typography>
                )}
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function ChangePasswordDialog({ open, onClose, clientId }) {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const token = getToken();

  const handleSave = async () => {
    if (!pwd || pwd.length < 4) { setMsg({ type: "error", text: "Mínimo 4 caracteres" }); return; }
    if (pwd !== confirm) { setMsg({ type: "error", text: "Las contraseñas no coinciden" }); return; }
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/v1/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: pwd }),
      });
      if (r.ok) { setMsg({ type: "success", text: "Contraseña actualizada" }); setPwd(""); setConfirm(""); }
      else setMsg({ type: "error", text: "Error al actualizar" });
    } catch { setMsg({ type: "error", text: "Error de conexión" }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Cambiar contraseña del cliente</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
        {msg && <Alert severity={msg.type}>{msg.text}</Alert>}
        <TextField label="Nueva contraseña" type="password" value={pwd} onChange={e => setPwd(e.target.value)} size="small" />
        <TextField label="Confirmar contraseña" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} size="small" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>Guardar</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ClientProfile() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const token = getToken();
  const claims = getClaims();

  const [client, setClient] = useState(null);
  const [orders, setOrders] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pwdOpen, setPwdOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/api/v1/clients/${clientId}`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/v1/orders?client_id=${clientId}`, { headers: h }).then(r => r.json()).catch(() => ({ orders: [] })),
      fetch(`${API}/api/v1/clients/${clientId}/discounts`, { headers: h }).then(r => r.json()).catch(() => ({ discounts: [] })),
    ]).then(([c, o, d]) => {
      setClient(c);
      setOrders((o.orders || []).sort((a, b) => b.id - a.id));
      setDiscounts(d.discounts || []);
      setLoading(false);
    }).catch(() => { setError("Error al cargar los datos del cliente"); setLoading(false); });
  }, [clientId, token]);

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ p: 3 }}><Alert severity="error">{error}</Alert></Box>;
  if (!client) return null;

  const canManage = ["business_admin", "super_admin", "branch_manager"].includes(claims.role);

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: "auto" }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={3}>
        <IconButton onClick={() => navigate(-1)}><ArrowBackIcon /></IconButton>
        <Typography variant="h5" fontWeight={700}>
          {client.full_name} {client.last_name || ""}
        </Typography>
        {client.client_type_name && <Chip label={client.client_type_name} color="primary" size="small" />}
      </Stack>

      <Grid container spacing={3}>
        {/* Datos del cliente */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Datos</Typography>
            <Divider sx={{ mb: 1 }} />
            <Stack spacing={0.5}>
              <Typography variant="body2"><b>Teléfono:</b> {client.phone || "—"}</Typography>
              <Typography variant="body2"><b>Email:</b> {client.email || "—"}</Typography>
              <Typography variant="body2"><b>Usuario portal:</b> {client.username || "—"}</Typography>
              {client.date_of_birth_month && client.date_of_birth_day && (
                <Typography variant="body2"><b>Cumpleaños:</b> {MONTHS[client.date_of_birth_month]} {client.date_of_birth_day}</Typography>
              )}
              {client.street_and_number && (
                <Typography variant="body2"><b>Dirección:</b> {client.street_and_number}</Typography>
              )}
              {client.neighborhood && <Typography variant="body2"><b>Colonia:</b> {client.neighborhood}</Typography>}
              {client.zip_code && <Typography variant="body2"><b>C.P.:</b> {client.zip_code}</Typography>}
              {client.notes && <Typography variant="body2"><b>Notas:</b> {client.notes}</Typography>}
            </Stack>
            {canManage && (
              <Stack direction="row" spacing={1} mt={2}>
                <Button size="small" variant="outlined" startIcon={<LockIcon />} onClick={() => setPwdOpen(true)}>
                  Cambiar contraseña
                </Button>
              </Stack>
            )}
          </Paper>

          {/* Descuentos */}
          <Paper sx={{ p: 2, mt: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <LocalOfferIcon fontSize="small" color="success" />
              <Typography variant="subtitle1" fontWeight={700}>Descuentos</Typography>
            </Stack>
            <Divider sx={{ mb: 1 }} />
            {discounts.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Sin descuentos activos</Typography>
            ) : (
              <Stack spacing={1}>
                {discounts.map(d => (
                  <Box key={d.id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2">{d.reason || "Descuento especial"}</Typography>
                    <Chip label={`${d.discount_pct}%`} color="success" size="small" />
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* Historial de órdenes */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Historial de órdenes ({orders.length})
            </Typography>
            <Divider sx={{ mb: 1 }} />
            {orders.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Sin órdenes registradas</Typography>
            ) : (
<TableContainer sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Folio</TableCell>
                      <TableCell>Creada</TableCell>
                      <TableCell>Entrega</TableCell>
                      <TableCell>Entregada</TableCell>
                      <TableCell>Estatus</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.map(o => <OrderRow key={o.id} order={o} />)}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      <ChangePasswordDialog open={pwdOpen} onClose={() => setPwdOpen(false)} clientId={clientId} />
    </Box>
  );
}
