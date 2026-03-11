import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Card, CardActionArea, CardContent,
  Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, Table, TableBody,
  TableCell, TableHead, TableRow, TableContainer, Paper,
} from "@mui/material";
import TodayIcon from "@mui/icons-material/Today";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import BoltIcon from "@mui/icons-material/Bolt";
import ElectricBoltIcon from "@mui/icons-material/ElectricBolt";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

const STATUS_COLORS = {
  "Pendiente": "default", "En Proceso": "info",
  "En Producción": "warning", "Listo": "success",
  "Entregado": "primary", "Cancelado": "error",
};

const STAT_CARDS = [
  { key: "overdue",      label: "Atrasadas",         color: "#d32f2f", bg: "#ffebee", icon: WarningAmberIcon,     filter: { type: "overdue" } },
  { key: "today_normal", label: "Hoy – Normal",       color: "#1976d2", bg: "#e3f2fd", icon: TodayIcon,            filter: { type: "today", urgency: "normal" } },
  { key: "today_urgent", label: "Hoy – Urgente",      color: "#e65100", bg: "#fff3e0", icon: BoltIcon,             filter: { type: "today", urgency: "urgent" } },
  { key: "today_extra",  label: "Hoy – Extra",        color: "#6a1b9a", bg: "#f3e5f5", icon: ElectricBoltIcon,     filter: { type: "today", urgency: "extra_urgent" } },
  { key: "past_30",      label: "+30 días sin recoger", color: "#f57c00", bg: "#fff8e1", icon: AccessTimeIcon,     filter: { type: "past", days: 30 } },
  { key: "past_60",      label: "+60 días sin recoger", color: "#c62828", bg: "#fce4ec", icon: HourglassBottomIcon, filter: { type: "past", days: 60 } },
  { key: "past_90",      label: "+90 días sin recoger", color: "#4a148c", bg: "#ede7f6", icon: HourglassBottomIcon, filter: { type: "past", days: 90 } },
];

export default function OrderStatsCards() {
  const token = localStorage.getItem("access_token");
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalFilter, setModalFilter] = useState(null);
  const [modalOrders, setModalOrders] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/v1/orders/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setStats)
      .catch(() => setStats({}))
      .finally(() => setLoading(false));
  }, [token]);

  const openModal = async (card) => {
    setModalFilter(card);
    setModalOrders([]);
    setModalLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/orders`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const all = data.orders || [];
      const todayStr = new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD (igual que backend)
      const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const active = all.filter(o => o.status !== "Entregado" && o.status !== "Cancelado");
      let filtered = active;
      const getDateStr = (dt) => dt ? dt.slice(0, 10) : null;
      if (card.filter.type === "overdue") {
        filtered = active.filter(o => {
          const ds = getDateStr(o.delivery_date);
          return ds && ds < todayStr;
        });
      } else if (card.filter.type === "today") {
        filtered = active.filter(o => {
          const ds = getDateStr(o.delivery_date);
          return ds === todayStr && o.urgency === card.filter.urgency;
        });
      } else if (card.filter.type === "past") {
        const cutoff = new Date(Date.now() - card.filter.days * 86400000).toISOString().slice(0, 10);
        filtered = active.filter(o => {
          const ds = getDateStr(o.delivery_date);
          return ds && ds <= cutoff;
        });
      }
      setModalOrders(filtered);
    } catch { setModalOrders([]); }
    setModalLoading(false);
  };

  if (loading) return <Box py={2}><CircularProgress size={20} /></Box>;
  if (!stats) return null;

  return (
    <>
      <Box
        display="grid"
        gridTemplateColumns="repeat(7, 1fr)"
        gap={2}
        mb={3}
        sx={{ gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)", md: "repeat(7, 1fr)" } }}
      >
        {STAT_CARDS.map(card => {
          const IconComp = card.icon;
          const count = stats[card.key] ?? 0;
          return (
            <Card
              key={card.key}
              elevation={count > 0 ? 3 : 1}
              sx={{
                cursor: "pointer",
                border: count > 0 ? `2px solid ${card.color}` : "1px solid #e0e0e0",
                bgcolor: count > 0 ? card.bg : "#fafafa",
                transition: "box-shadow 0.2s",
                "&:hover": { boxShadow: 6 },
              }}
            >
              <CardActionArea onClick={() => openModal(card)} sx={{ p: 2, textAlign: "center" }}>
                <IconComp sx={{ color: count > 0 ? card.color : "#bdbdbd", fontSize: 30, mb: 0.5 }} />
                <Typography variant="h4" fontWeight={700} color={count > 0 ? card.color : "text.disabled"}>
                  {count}
                </Typography>
                <Typography variant="caption" color="text.secondary" lineHeight={1.3} display="block">
                  {card.label}
                </Typography>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>

      <Dialog open={!!modalFilter} onClose={() => setModalFilter(null)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {modalFilter?.label} — {modalOrders.length} nota(s)
        </DialogTitle>
        <DialogContent>
          {modalLoading ? (
            <Box textAlign="center" py={4}><CircularProgress /></Box>
          ) : modalOrders.length === 0 ? (
            <Alert severity="info">No hay órdenes en esta categoría.</Alert>
          ) : (
<TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Folio</strong></TableCell>
                    <TableCell><strong>Cliente</strong></TableCell>
                    <TableCell><strong>Urgencia</strong></TableCell>
                    <TableCell><strong>Entrega programada</strong></TableCell>
                    <TableCell><strong>Estado</strong></TableCell>
                    <TableCell><strong>Total</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {modalOrders.map(o => (
                    <TableRow
                      key={o.id}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() => { setModalFilter(null); navigate(`/orders/${o.id}`); }}
                    >
                      <TableCell sx={{ fontFamily: "monospace", fontWeight: 600 }}>{o.folio || `#${o.id}`}</TableCell>
                      <TableCell>{o.client_name || "—"}</TableCell>
                      <TableCell><Chip label={o.urgency} size="small" /></TableCell>
                      <TableCell sx={{ color: "error.main" }}>
                        {o.delivery_date ? new Date(o.delivery_date).toLocaleDateString("es-MX") : "—"}
                      </TableCell>
                      <TableCell>
                        <Chip label={o.status} color={STATUS_COLORS[o.status] || "default"} size="small" />
                      </TableCell>
                      <TableCell>${parseFloat(o.total_amount).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalFilter(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
