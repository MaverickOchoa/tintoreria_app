import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container, Box, Typography, Paper, Divider,
  Button, Chip, CircularProgress, Alert,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PrintIcon from "@mui/icons-material/Print";
import OrderReceipt, { usePrintReceipt } from "./OrderReceipt";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
const paymentLabel = { cash: "Efectivo", card: "Tarjeta", points: "Puntos" };
const payStatusColor = { paid: "success", partial: "warning", pending: "error" };
const payStatusLabel = { paid: "Pagado", partial: "Pago parcial", pending: "Pendiente de pago" };
const getClaims = () => { try { return JSON.parse(localStorage.getItem("user_claims") || "{}"); } catch { return {}; } };

const DAYS_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const clean = String(dateStr).includes("T") ? String(dateStr).split("T")[0] : String(dateStr);
  const [y, m, d] = clean.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return `${String(d).padStart(2,"0")}/${String(m).padStart(2,"0")}/${y}`;
}

export default function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");
  const claims = getClaims();
  const printReceipt = usePrintReceipt();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [businessInfo, setBusinessInfo] = useState(null);
  const [businessHours, setBusinessHours] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/v1/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.id) setOrder(d); else setError(d.message || "Error al cargar la orden."); })
      .catch(() => setError("Error de conexión."))
      .finally(() => setLoading(false));

    if (claims.business_id) {
      fetch(`${API}/businesses/${claims.business_id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => setBusinessInfo(d)).catch(() => {});
      fetch(`${API}/api/v1/businesses/${claims.business_id}/hours`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => setBusinessHours(Array.isArray(d) ? d : (d.hours || []))).catch(() => {});
    }
  }, [orderId]);

  if (loading) return <Box textAlign="center" py={5}><CircularProgress /></Box>;
  if (error)   return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
  if (!order)  return null;

  const subtotal = parseFloat(order.subtotal || 0);
  const discount = parseFloat(order.discount || 0);
  const tax      = parseFloat(order.tax || 0);
  const total    = parseFloat(order.total_amount || 0);
  const paid     = parseFloat(order.amount_paid || 0);
  const pending  = total - paid;
  const totalPieces = (order.items || []).reduce((s, i) => s + (parseInt(i.quantity) || 0), 0);

  const deliveryDay = order.delivery_date
    ? DAYS_ES[new Date(order.delivery_date + "T12:00:00").getDay()]
    : "";

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      {/* Toolbar */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/orders")}>
          Volver a Órdenes
        </Button>
        <Button
          startIcon={<PrintIcon />}
          variant="contained"
          onClick={() => printReceipt(order, businessInfo, businessHours)}
        >
          Imprimir Nota
        </Button>
      </Box>

      {/* ── ENCABEZADO DEL NEGOCIO ── */}
      {businessInfo && (
        <Paper elevation={1} sx={{ p: 2, mb: 2, textAlign: "center", fontFamily: "monospace" }}>
          <Typography variant="h6" fontWeight={700}>{businessInfo.business_name || businessInfo.name}</Typography>
          {(businessInfo.rfc || businessInfo.curp || businessInfo.sime) && (
            <Typography variant="body2">
              {[businessInfo.rfc && `RFC: ${businessInfo.rfc}`, businessInfo.curp && `CURP: ${businessInfo.curp}`, businessInfo.sime && `SIEM: ${businessInfo.sime}`].filter(Boolean).join("   ")}
            </Typography>
          )}
          {businessInfo.street && (
            <Typography variant="body2">
              {businessInfo.street}{businessInfo.ext_num ? `, #${businessInfo.ext_num}` : ""}{businessInfo.int_num ? ` Int. ${businessInfo.int_num}` : ""}
            </Typography>
          )}
          {(businessInfo.colonia || businessInfo.cp || businessInfo.phone) && (
            <Typography variant="body2">
              {[businessInfo.colonia && `Col. ${businessInfo.colonia}`, businessInfo.cp && `C.P. ${businessInfo.cp}`, businessInfo.phone && `Tel: ${businessInfo.phone}`].filter(Boolean).join("   ")}
            </Typography>
          )}
          {(businessInfo.alcaldia || businessInfo.city) && (
            <Typography variant="body2">{[businessInfo.alcaldia, businessInfo.city].filter(Boolean).join(", ")}</Typography>
          )}
          {businessInfo.regimen_fiscal && (
            <Typography variant="body2">Régimen: {businessInfo.regimen_fiscal}</Typography>
          )}
        </Paper>
      )}

      <Paper elevation={3} sx={{ p: 3 }}>
        {/* ── NOTA + STATUS ── */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Nota: {order.folio || `#${order.id}`}</Typography>
            <Typography variant="caption" color="text.secondary">ID interno: #{order.id}</Typography>
          </Box>
          <Box display="flex" flexDirection="column" alignItems="flex-end" gap={0.5}>
            <Chip label={order.status} color="primary" variant="outlined" size="small" />
            <Chip label={payStatusLabel[order.payment_status] || order.payment_status}
              color={payStatusColor[order.payment_status] || "default"} size="small" />
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* ── CLIENTE + FECHAS lado a lado ── */}
        <Box display="grid" sx={{ gridTemplateColumns: "1fr 1fr", gap: 3, mb: 3 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Cliente</Typography>
            <Typography variant="h6">{order.client_name || "N/A"}</Typography>
          </Box>
          <Box display="grid" sx={{ gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Recibida</Typography>
              <Typography variant="body1" fontWeight={500}>{fmtDate(order.order_date)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Entrega</Typography>
              <Typography variant="body1" fontWeight={500}>
                {fmtDate(order.delivery_date)}{deliveryDay ? ` — ${deliveryDay}` : ""}
              </Typography>
              {order.delivered_at && (
                <Typography variant="caption" color="success.main" display="block">
                  Entregada: {fmtDate(order.delivered_at)}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* ── ARTÍCULOS ── */}
        <Typography variant="subtitle1" fontWeight={700} mb={1}>Artículos</Typography>
        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, mb: 3 }}>
          {/* Header */}
          <Box display="grid" sx={{ gridTemplateColumns: "1fr 60px 90px 90px", px: 2, py: 1, bgcolor: "grey.50", borderBottom: "1px solid", borderColor: "divider", fontWeight: 700, fontSize: "0.8rem" }}>
            <span>Artículo / Servicio</span>
            <span style={{ textAlign: "center" }}>Cant</span>
            <span style={{ textAlign: "right" }}>P. Unitario</span>
            <span style={{ textAlign: "right" }}>Subtotal</span>
          </Box>
          {(order.items || []).map((item, i) => (
            <Box key={i} display="grid" sx={{ gridTemplateColumns: "1fr 60px 90px 90px", px: 2, py: 1, borderBottom: i < order.items.length - 1 ? "1px solid" : "none", borderColor: "divider", fontSize: "0.875rem" }}>
              <span>{item.product_name}{item.service_name ? <Typography component="span" variant="caption" color="text.secondary"> ({item.service_name})</Typography> : ""}</span>
              <span style={{ textAlign: "center" }}>{item.quantity}</span>
              <span style={{ textAlign: "right" }}>${parseFloat(item.unit_price || 0).toFixed(2)}</span>
              <span style={{ textAlign: "right" }}>${parseFloat(item.line_total || 0).toFixed(2)}</span>
            </Box>
          ))}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* ── FOOTER: izquierda + derecha mitad cada una ── */}
        <Box display="grid" sx={{ gridTemplateColumns: "1fr 1fr", gap: 3 }}>
          {/* Izquierda */}
          <Box>
            <Typography variant="body2"><strong>Total piezas:</strong> {totalPieces}&nbsp;&nbsp;&nbsp;<strong>Kgs.:</strong> 0.00</Typography>
            {order.created_by_name && (
              <Typography variant="body2" mt={0.5}><strong>Atendido por:</strong> {order.created_by_name}</Typography>
            )}
            <Box mt={1.5} display="flex" gap={4}>
              <Typography variant="body2"><strong>A cuenta:</strong> ${paid.toFixed(2)}</Typography>
              <Typography variant="body2" color={pending > 0.009 ? "warning.main" : "success.main"}>
                <strong>Resta:</strong> ${pending > 0.009 ? pending.toFixed(2) : "0.00"}
              </Typography>
            </Box>
          </Box>

          {/* Derecha — totales */}
          <Box>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" color="text.secondary">Subtotal</Typography>
              <Typography variant="body2">${subtotal.toFixed(2)}</Typography>
            </Box>
            {discount > 0 && (
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography variant="body2" color="text.secondary">Descuento</Typography>
                <Typography variant="body2" color="error.main">-${discount.toFixed(2)}</Typography>
              </Box>
            )}
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" color="text.secondary">IVA</Typography>
              <Typography variant="body2">${tax.toFixed(2)}</Typography>
            </Box>
            <Divider sx={{ my: 0.5 }} />
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="subtitle1" fontWeight={700}>Total</Typography>
              <Typography variant="subtitle1" fontWeight={700} color="primary">${total.toFixed(2)}</Typography>
            </Box>
            {(order.payments || []).map((p, i) => (
              <Box key={i} display="flex" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">{paymentLabel[p.method] || p.method}</Typography>
                <Typography variant="caption">${parseFloat(p.amount).toFixed(2)}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {order.notes && (
          <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
            <Typography variant="subtitle2" gutterBottom>Notas</Typography>
            <Typography variant="body2">{order.notes}</Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
}
