import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Paper, Typography, Divider,
  Collapse, Chip, CircularProgress, Alert,
  Button, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField,
  BottomNavigation, BottomNavigationAction,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import HistoryIcon from "@mui/icons-material/History";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import LockIcon from "@mui/icons-material/Lock";

const API = import.meta.env.VITE_API_URL || API;

const MONTHS = ["", "Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

function useBranding(businessId) {
  const [brand, setBrand] = useState({ portal_primary_color: "#1976d2", portal_bg_color: "#f5f5f5", portal_slogan: "", portal_logo_url: "", name: "" });
  useEffect(() => {
    if (!businessId) return;
    fetch(`${API}/api/v1/businesses/${businessId}/public`)
      .then(r => r.json())
      .then(d => setBrand(d))
      .catch(() => {});
  }, [businessId]);
  return brand;
}

export default function ClientPortal() {
  const navigate = useNavigate();
  const token = localStorage.getItem("client_access_token");
  const clientInfo = JSON.parse(localStorage.getItem("client_info") || "{}");
  const brand = useBranding(clientInfo.business_id);

  const [tab, setTab] = useState(0);
  const [me, setMe] = useState(null);
  const [orders, setOrders] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [cpForm, setCpForm] = useState({ current: "", next: "", confirm: "" });
  const [cpMsg, setCpMsg] = useState(null);
  const [cpSaving, setCpSaving] = useState(false);

  const handleChangeClientPw = async () => {
    if (!cpForm.current || !cpForm.next || !cpForm.confirm) { setCpMsg({ type: "error", text: "Completa todos los campos" }); return; }
    if (cpForm.next.length < 6) { setCpMsg({ type: "error", text: "Mínimo 6 caracteres" }); return; }
    if (cpForm.next !== cpForm.confirm) { setCpMsg({ type: "error", text: "Las contraseñas no coinciden" }); return; }
    setCpSaving(true); setCpMsg(null);
    try {
      const res = await fetch(`${API}/api/v1/client-portal/change-password`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: cpForm.current, new_password: cpForm.next }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.message || "Error");
      setCpMsg({ type: "success", text: "Contraseña actualizada" });
      setCpForm({ current: "", next: "", confirm: "" });
    } catch (e) {
      setCpMsg({ type: "error", text: e.message });
    } finally {
      setCpSaving(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setError("No hay sesión activa. Por favor inicia sesión.");
      setLoading(false);
      return;
    }
    const h = { Authorization: `Bearer ${token}` };
    const safeFetch = (url) =>
      fetch(url, { headers: h })
        .then(r => r.json())
        .catch(() => null);

    Promise.all([
      safeFetch(`${API}/api/v1/client-portal/me`),
      safeFetch(`${API}/api/v1/client-portal/orders`),
      safeFetch(`${API}/api/v1/client-portal/discounts`),
    ])
      .then(([meData, ordersData, discData]) => {
        if (!meData || meData.message) {
          setError(meData?.message || "Error al cargar tu información. Intenta cerrar sesión e iniciar de nuevo.");
          return;
        }
        setMe(meData);
        setOrders((ordersData?.orders) || []);
        setDiscounts((discData?.discounts) || []);
        setPromotions((discData?.promotions) || []);
      })
      .catch((err) => setError(`Error de conexión: ${err.message}`))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("client_access_token");
    localStorage.removeItem("client_info");
    navigate("/client-portal");
  };

  const statusColor = (s) => {
    if (!s) return "default";
    const low = s.toLowerCase();
    if (low.includes("entregad")) return "success";
    if (low.includes("list")) return "info";
    if (low.includes("cancel")) return "error";
    return "warning";
  };

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <CircularProgress />
    </Box>
  );

  if (error) return (
    <Box p={3} display="flex" flexDirection="column" alignItems="center" gap={2}>
      <Alert severity="error" sx={{ maxWidth: 500, width: "100%" }}>{error}</Alert>
      <Button variant="outlined" onClick={() => { localStorage.removeItem("client_access_token"); localStorage.removeItem("client_info"); window.location.href = "/client-portal"; }}>
        Ir al login
      </Button>
    </Box>
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: brand.portal_bg_color, pb: 8 }}>
      <Box sx={{ maxWidth: 700, mx: "auto", p: { xs: 1, sm: 3 } }}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={1.5}>
              {brand.portal_logo_url && (
                <Box component="img" src={brand.portal_logo_url} alt="logo"
                  sx={{ height: 40, objectFit: "contain" }} />
              )}
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ color: brand.portal_primary_color }}>
                  Hola, {me?.full_name} {me?.last_name || ""}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {brand.portal_slogan || brand.name || "Portal del Cliente"}
                </Typography>
              </Box>
            </Box>
            <Button size="small" startIcon={<LogoutIcon />} onClick={handleLogout} color="inherit">
              Salir
            </Button>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* HISTORIAL */}
          {tab === 0 && (
            orders.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={4}>
                Aún no tienes notas registradas.
              </Typography>
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
                    {orders.map(order => {
                      const fmt = (d) => d ? new Date(d).toLocaleDateString("es-MX") : "—";
                      const isOpen = expandedOrder === order.id;
                      return (
                        <React.Fragment key={order.id}>
                          <TableRow hover sx={{ cursor: "pointer" }} onClick={() => setExpandedOrder(isOpen ? null : order.id)}>
                            <TableCell>{order.folio || order.id}</TableCell>
                            <TableCell>{fmt(order.order_date)}</TableCell>
                            <TableCell>{fmt(order.delivery_date)}</TableCell>
                            <TableCell>{fmt(order.delivered_at)}</TableCell>
                            <TableCell>
                              <Chip label={order.status || "Pendiente"} size="small" color={statusColor(order.status)} />
                            </TableCell>
                            <TableCell align="right">${parseFloat(order.total_amount || 0).toFixed(2)}</TableCell>
                            <TableCell>{isOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
                              <Collapse in={isOpen} unmountOnExit>
                                <Box sx={{ p: 2, bgcolor: "#fafafa" }}>
                                  {(order.items || []).length > 0 ? (
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
                                        {order.items.map((item, i) => (
                                          <TableRow key={i}>
                                            <TableCell>{item.product_name || item.item_name || "—"}</TableCell>
                                            <TableCell align="center">{item.quantity}</TableCell>
                                            <TableCell align="right">${parseFloat(item.unit_price || 0).toFixed(2)}</TableCell>
                                            <TableCell align="right">${parseFloat(item.line_total || 0).toFixed(2)}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">Sin detalle disponible</Typography>
                                  )}
                                  <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.25 }}>
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
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          )}

          {/* MIS DATOS */}
          {tab === 1 && me && (
            <Stack spacing={1.5}>
              <Box display="flex" justifyContent="space-between">
                <Typography color="text.secondary">Nombre</Typography>
                <Typography fontWeight={500}>{me.full_name} {me.last_name || ""}</Typography>
              </Box>
              <Divider />
              <Box display="flex" justifyContent="space-between">
                <Typography color="text.secondary">Teléfono</Typography>
                <Typography fontWeight={500}>{me.phone}</Typography>
              </Box>
              {me.email && <>
                <Divider />
                <Box display="flex" justifyContent="space-between">
                  <Typography color="text.secondary">Correo</Typography>
                  <Typography fontWeight={500}>{me.email}</Typography>
                </Box>
              </>}
              {me.client_type_name && <>
                <Divider />
                <Box display="flex" justifyContent="space-between">
                  <Typography color="text.secondary">Tipo de cliente</Typography>
                  <Chip label={me.client_type_name} size="small" color="primary" />
                </Box>
              </>}
              {(me.date_of_birth_day && me.date_of_birth_month) && <>
                <Divider />
                <Box display="flex" justifyContent="space-between">
                  <Typography color="text.secondary">Cumpleaños</Typography>
                  <Typography fontWeight={500}>
                    {me.date_of_birth_day} de {MONTHS[parseInt(me.date_of_birth_month, 10)] || ""}
                  </Typography>
                </Box>
              </>}
              <Divider />
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "primary.50", borderRadius: 1, px: 2, py: 1.5, border: "1px solid", borderColor: "primary.200" }}>
                <Typography fontWeight={700} color="primary.main">Puntos acumulados</Typography>
                <Typography variant="h6" fontWeight={700} color="primary.main">{(me.points_balance || 0).toFixed(0)} pts</Typography>
              </Box>
              <Alert severity="info" sx={{ mt: 1 }}>
                Para modificar tus datos acude a cualquier sucursal.
              </Alert>
            </Stack>
          )}

          {/* DESCUENTOS Y PROMOCIONES */}
          {tab === 2 && (
            <>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Mis Descuentos</Typography>
              {discounts.length === 0 ? (
                <Typography color="text.secondary" variant="body2" mb={2}>
                  No tienes descuentos asignados actualmente.
                </Typography>
              ) : (
                <Stack spacing={1} mb={3}>
                  {discounts.map(d => (
                    <Paper key={d.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography fontWeight={600} color="primary">{d.discount_pct}% de descuento</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {d.created_at ? new Date(d.created_at).toLocaleDateString("es-MX") : ""}
                        </Typography>
                      </Box>
                      {d.reason && <Typography variant="body2" color="text.secondary">{d.reason}</Typography>}
                    </Paper>
                  ))}
                </Stack>
              )}
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Promociones</Typography>
              {promotions.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                  No hay promociones activas para tu tipo de cliente.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {promotions.map(p => (
                    <Paper key={p.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: "primary.main" }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <Typography fontWeight={600}>{p.title}</Typography>
                        {p.discount_pct && (
                          <Chip label={`${p.discount_pct}% OFF`} size="small" color="success" />
                        )}
                      </Box>
                      {p.description && <Typography variant="body2" color="text.secondary">{p.description}</Typography>}
                      {p.client_type_name && (
                        <Typography variant="caption" color="text.secondary">Para clientes: {p.client_type_name}</Typography>
                      )}
                    </Paper>
                  ))}
                </Stack>
              )}
            </>
          )}

          {/* CONTRASEÑA */}
          {tab === 3 && (
            <>
              <Typography variant="h6" fontWeight={700} mb={2}>Cambiar Contraseña</Typography>
              {cpMsg && <Alert severity={cpMsg.type} sx={{ mb: 2 }}>{cpMsg.text}</Alert>}
              <Stack spacing={2} maxWidth={360}>
                <TextField type="password" fullWidth label="Contraseña actual" value={cpForm.current}
                  onChange={e => setCpForm(p => ({ ...p, current: e.target.value }))} />
                <TextField type="password" fullWidth label="Nueva contraseña" value={cpForm.next}
                  onChange={e => setCpForm(p => ({ ...p, next: e.target.value }))} helperText="Mínimo 6 caracteres" />
                <TextField type="password" fullWidth label="Confirmar nueva contraseña" value={cpForm.confirm}
                  onChange={e => setCpForm(p => ({ ...p, confirm: e.target.value }))} />
                <Button variant="contained" disabled={cpSaving} onClick={handleChangeClientPw}
                  startIcon={cpSaving ? <CircularProgress size={18} color="inherit" /> : <LockIcon />}>
                  {cpSaving ? "Guardando..." : "Cambiar Contraseña"}
                </Button>
              </Stack>
            </>
          )}
        </Paper>
      </Box>

      {/* BOTTOM NAVIGATION — solo íconos */}
      <Paper elevation={8} sx={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1300,
        borderTop: "1px solid", borderColor: "divider",
      }}>
        <BottomNavigation
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            "& .Mui-selected": { color: `${brand.portal_primary_color} !important` },
            "& .MuiBottomNavigationAction-root": { minWidth: 0, padding: "6px 0" },
          }}
        >
          <BottomNavigationAction icon={<HistoryIcon />} showLabel={false} />
          <BottomNavigationAction icon={<PersonIcon />} showLabel={false} />
          <BottomNavigationAction icon={<LocalOfferIcon />} showLabel={false} />
          <BottomNavigationAction icon={<LockIcon />} showLabel={false} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
