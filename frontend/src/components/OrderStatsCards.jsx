import React, { useState, useEffect } from "react";
import {
  Box, Typography, Card, CardActionArea, CardContent,
  Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, Table, TableBody,
  TableCell, TableHead, TableRow, TableContainer, Paper,
} from "@mui/material";
import TodayIcon from "@mui/icons-material/Today";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import LocalLaundryServiceIcon from "@mui/icons-material/LocalLaundryService";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import MoneyOffIcon from "@mui/icons-material/MoneyOff";
import AssessmentIcon from "@mui/icons-material/Assessment";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import WatchLaterIcon from "@mui/icons-material/WatchLater";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import { useNavigate } from "react-router-dom";
import { useRealTime } from "../context/RealTimeContext";

const API = import.meta.env.VITE_API_URL;

const STATUS_COLORS = {
  "Recibido": "default",
  "En Lavado": "info",
  "En Planchado": "secondary",
  "Listo": "success",
  "Entregado": "success",
  "Cancelado": "error",
};

const STAT_CARDS = [
  { key: "today_regular", label: "Para Hoy (Regular)", icon: TodayIcon, filter: { type: "today", urgency: "regular" } },
  { key: "today_express", label: "Para Hoy (Express)", icon: LocalLaundryServiceIcon, filter: { type: "today", urgency: "express" } },
  { key: "today_urgent", label: "Para Hoy (Urgente)", icon: AssignmentTurnedInIcon, filter: { type: "today", urgency: "urgent" } },
  { key: "overdue", label: "Atrasadas", icon: WarningAmberIcon, filter: { type: "overdue" } },
  { key: "ready", label: "Listas para Entregar", icon: DoneAllIcon, filter: { type: "status", value: "Listo" } },
  { key: "unpaid", label: "Pendientes de Pago", icon: MoneyOffIcon, filter: { type: "unpaid" } },
  { key: "past_3days", label: "Hace 3+ das", icon: WatchLaterIcon, filter: { type: "past", days: 3 } },
];

export default function OrderStatsCards() {
  const token = localStorage.getItem("access_token");
  let role = "";
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      role = payload.role || "";
    } catch(e){}
  }
  const canCutCash = ["Colaborador", "Gerente", "business_admin", "super_admin"].includes(role);
  const canViewReports = ["Gerente", "business_admin", "super_admin"].includes(role);

  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalFilter, setModalFilter] = useState(null);
  const [modalOrders, setModalOrders] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const { now, clockAlert } = useRealTime();
  const branchId = localStorage.getItem("branch_id");

  useEffect(() => {
    const url = branchId
      ? `${API}/orders/stats?branch_id=${branchId}`
      : `${API}/orders/stats`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setStats)
      .catch(() => setStats({}))
      .finally(() => setLoading(false));
  }, [token, branchId]);

  const openModal = async (card) => {
    setModalFilter(card);
    setModalOrders([]);
    setModalLoading(true);
    try {
      const url = branchId
        ? `${API}/orders?branch_id=${branchId}`
        : `${API}/orders`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const all = (Array.isArray(data) ? data : (data.orders || []));
      const todayStr = now.toISOString().slice(0, 10);
      const active = all.filter(o => o.status !== "Entregado" && o.status !== "Cancelado");
      const getDateStr = (dt) => dt ? dt.slice(0, 10) : null;
      let filtered = active;
      if (card.filter.type === "overdue") {
        filtered = active.filter(o => { const ds = getDateStr(o.delivery_date); return ds && ds < todayStr; });
      } else if (card.filter.type === "today") {
        filtered = active.filter(o => { const ds = getDateStr(o.delivery_date); return ds === todayStr && o.urgency === card.filter.urgency; });
      } else if (card.filter.type === "past") {
        const cutoff = new Date(now - card.filter.days * 86400000).toISOString().slice(0, 10);
        filtered = active.filter(o => { const ds = getDateStr(o.delivery_date); return ds && ds <= cutoff; });
      }
      setModalOrders(filtered);
    } catch { setModalOrders([]); }
    setModalLoading(false);
  };

  const dateStr = now.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <>
      {clockAlert && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          El reloj del sistema parece estar desincronizado con la hora real. Ajstalo para evitar errores en las fechas de entrega.
        </Alert>
      )}

      <Box display="flex" alignItems="center" gap={1} mb={2} flexWrap="wrap">
        <WatchLaterIcon fontSize="small" color="action" />
        <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ textTransform: "capitalize" }}>
          {dateStr}
        </Typography>
        <Typography variant="body2" color="primary" fontWeight={700}>
          {timeStr}
        </Typography>
        <Box flex={1} />
        
        {canCutCash && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<PointOfSaleIcon />}
            onClick={() => navigate("/corte-de-caja")}
            sx={{ whiteSpace: "nowrap" }}
          >
            Corte de Caja
          </Button>
        )}
        
        {canViewReports && (
          <>
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              startIcon={<AssessmentIcon />}
              onClick={() => navigate("/reportes")}
              sx={{ whiteSpace: "nowrap" }}
            >
              Reportes
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              startIcon={<AssessmentIcon />}
              onClick={() => navigate("/reportes/clientes")}
              sx={{ whiteSpace: "nowrap" }}
            >
              Comportamiento
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              startIcon={<AssessmentIcon />}
              onClick={() => navigate("/reportes/rentabilidad")}
              sx={{ whiteSpace: "nowrap" }}
            >
              Rentabilidad
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              startIcon={<ReceiptLongIcon />}
              onClick={() => navigate("/gastos")}
              sx={{ whiteSpace: "nowrap" }}
            >
              Gastos
            </Button>
          </>
        )}
      </Box>

      {loading ? <Box py={2}><CircularProgress size={20} /></Box> : (
        <Box
          display="grid"
          gap={2}
          mb={3}
          sx={{ gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)", md: "repeat(7, 1fr)" } }}
        >
          {STAT_CARDS.map(card => {
            const IconComp = card.icon;
            const count = stats?.[card.key] ?? 0;
            return (
              <Card key={card.key} elevation={1}
                sx={{
                  borderRadius: 3, cursor: "pointer",
                  border: "1px solid #e8e8e8",
                  bgcolor: "#fff",
                  transition: "box-shadow 0.2s",
                  "&:hover": { boxShadow: 3 },
                }}
                onClick={() => openModal(card)}>
                <CardActionArea sx={{ p: 2 }}>
                  <CardContent sx={{ p: 0, "&:last-child": { pb: 0 }, textAlign: "center" }}>
                    <IconComp sx={{ fontSize: 32, color: "text.disabled", mb: 1 }} />
                    <Typography variant="h3" fontWeight={400} lineHeight={1} color="text.secondary" mb={0.5}>
                      {count}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" lineHeight={1.2}>
                      {card.label}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      )}

      <Dialog open={!!modalFilter} onClose={() => setModalFilter(null)} maxWidth="md" fullWidth>
        <DialogTitle>{modalFilter?.label}</DialogTitle>
        <DialogContent>
          {modalLoading ? <CircularProgress /> : modalOrders.length === 0 ? (
            <Typography color="text.secondary">No hay rdenes en esta categora.</Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Folio</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Entrega</TableCell>
                    <TableCell>Estatus</TableCell>
                    <TableCell>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {modalOrders.map(o => (
                    <TableRow key={o.id} hover sx={{ cursor: "pointer" }}
                      onClick={() => { setModalFilter(null); navigate(`/orders/${o.id}`); }}>
                      <TableCell>{o.folio_number || o.id}</TableCell>
                      <TableCell>{o.client_name || "?"}</TableCell>
                      <TableCell>{o.delivery_date ? new Date(o.delivery_date).toLocaleDateString("es-MX") : "?"}</TableCell>
                      <TableCell><Chip label={o.status} color={STATUS_COLORS[o.status] || "default"} size="small" /></TableCell>
                      <TableCell>${parseFloat(o.total_amount || 0).toFixed(2)}</TableCell>
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
