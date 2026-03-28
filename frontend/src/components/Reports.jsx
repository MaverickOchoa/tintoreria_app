import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, Grid, Button, TextField, MenuItem,
  CircularProgress, Chip, Alert, Tabs, Tab, Divider,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  Card, CardContent, LinearProgress, Avatar,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import LocalLaundryServiceIcon from "@mui/icons-material/LocalLaundryService";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import StorefrontIcon from "@mui/icons-material/Storefront";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  FunnelChart, Funnel, LabelList,
} from "recharts";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
const COLORS = ["#1976d2", "#43a047", "#e53935", "#fb8c00", "#8e24aa", "#00acc1", "#f4511e"];
const fmt = (n) => Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 });
const fmtNum = (n) => Number(n || 0).toLocaleString("es-MX");

function KpiCard({ label, value, sub, color = "#1976d2", icon }) {
  return (
    <Card elevation={2} sx={{ borderRadius: 3, borderTop: `4px solid ${color}`, height: "100%" }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
              {label}
            </Typography>
            <Typography variant="h5" fontWeight={700} color={color} mt={0.5}>{value}</Typography>
            {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
          </Box>
          {icon && <Avatar sx={{ bgcolor: `${color}18`, color }}>{icon}</Avatar>}
        </Box>
      </CardContent>
    </Card>
  );
}

function SectionTitle({ children }) {
  return (
    <Typography variant="subtitle1" fontWeight={700} color="text.secondary"
      sx={{ textTransform: "uppercase", letterSpacing: 1, fontSize: 12, mb: 2, mt: 1 }}>
      {children}
    </Typography>
  );
}

function EmptyState({ text = "Sin datos para el período seleccionado" }) {
  return (
    <Box sx={{ py: 6, textAlign: "center", color: "text.disabled" }}>
      <Typography variant="body2">{text}</Typography>
    </Box>
  );
}

const TABS = [
  { label: "Ventas", icon: <TrendingUpIcon fontSize="small" /> },
  { label: "Órdenes", icon: <AssignmentIcon fontSize="small" /> },
  { label: "Por Cobrar", icon: <AccountBalanceWalletIcon fontSize="small" /> },
  { label: "Clientes", icon: <PeopleAltIcon fontSize="small" /> },
  { label: "Prendas", icon: <LocalLaundryServiceIcon fontSize="small" /> },
  { label: "Descuentos", icon: <LocalOfferIcon fontSize="small" /> },
  { label: "Sucursales", icon: <StorefrontIcon fontSize="small" /> },
];

export default function Reports() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");
  const role = localStorage.getItem("role");
  const storedBranch = localStorage.getItem("branch_id");
  const isBA = role === "business_admin";

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  const [tab, setTab] = useState(0);
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(todayStr);
  const [branchId, setBranchId] = useState(storedBranch || "");
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  const [sales, setSales] = useState(null);
  const [dailyTrend, setDailyTrend] = useState([]);
  const [orderFlow, setOrderFlow] = useState(null);
  const [receivable, setReceivable] = useState(null);
  const [clientsData, setClientsData] = useState(null);
  const [topItems, setTopItems] = useState([]);
  const [discounts, setDiscounts] = useState(null);
  const [byBranch, setByBranch] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!isBA) return;
    const biz = localStorage.getItem("business_id");
    if (!biz) return;
    fetch(`${API}/businesses/${biz}`, { headers })
      .then(r => r.json())
      .then(d => setBranches(Array.isArray(d.branches) ? d.branches : []))
      .catch(() => {});
  }, []);

  const params = useCallback(() => {
    const p = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
    if (branchId) p.append("branch_id", branchId);
    return p.toString();
  }, [dateFrom, dateTo, branchId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const p = params();
    const get = (url) => fetch(`${API}${url}?${p}`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null);
    const alertsGet = () => {
      const ap = new URLSearchParams();
      if (branchId) ap.append("branch_id", branchId);
      return fetch(`${API}/api/v1/reports/alerts?${ap}`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null);
    };

    const ovGet = () => {
      const op = new URLSearchParams();
      if (branchId) op.append("branch_id", branchId);
      return fetch(`${API}/api/v1/reports/overview?${op}`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null);
    };

    const [s, dt, ov, rec, cd, ti, disc, bb, al] = await Promise.all([
      get("/api/v1/reports/summary"),
      get("/api/v1/reports/daily-trend"),
      ovGet(),
      get("/api/v1/reports/receivable"),
      get("/api/v1/reports/clients-detail"),
      get("/api/v1/reports/top-items"),
      get("/api/v1/reports/discounts"),
      get("/api/v1/reports/by-branch"),
      alertsGet(),
    ]);

    setSales(s);
    setDailyTrend(Array.isArray(dt) ? dt : []);
    setOrderFlow(ov);
    setReceivable(rec);
    setClientsData(cd);
    setTopItems(Array.isArray(ti) ? ti : []);
    setDiscounts(disc);
    setByBranch(Array.isArray(bb) ? bb : []);
    setAlerts(Array.isArray(al) ? al : []);
    setLoading(false);
  }, [params]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSearch = () => fetchAll();

  return (
    <Box sx={{ bgcolor: "#f5f7fa", minHeight: "100vh", p: { xs: 1.5, md: 3 } }}>
      <Box sx={{ maxWidth: 1300, mx: "auto" }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} size="small">Volver</Button>
          <Typography variant="h5" fontWeight={700}>Reportes</Typography>
          {loading && <CircularProgress size={20} />}
        </Box>

        {/* Filters */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: "1px solid #e0e0e0" }}>
          <Grid container spacing={2} alignItems="center">
            {isBA && branches.length > 0 && (
              <Grid item xs={12} sm={3}>
                <TextField select fullWidth size="small" label="Sucursal" value={branchId}
                  onChange={e => setBranchId(e.target.value)}>
                  <MenuItem value="">Todas las sucursales</MenuItem>
                  {branches.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                </TextField>
              </Grid>
            )}
            <Grid item xs={6} sm={3}>
              <TextField fullWidth size="small" type="date" label="Desde" value={dateFrom}
                onChange={e => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth size="small" type="date" label="Hasta" value={dateTo}
                onChange={e => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button fullWidth variant="contained" onClick={handleSearch} disabled={loading}>
                Buscar
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Alerts */}
        {alerts.length > 0 && (
          <Box sx={{ mb: 2, display: "flex", flexDirection: "column", gap: 1 }}>
            {alerts.map((a, i) => (
              <Alert key={i} severity={a.level === "red" ? "error" : a.level === "yellow" ? "warning" : "success"}
                sx={{ borderRadius: 2 }}>
                {a.message}
              </Alert>
            ))}
          </Box>
        )}

        {/* Tabs */}
        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e0e0e0" }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
            sx={{ bgcolor: "#fff", borderBottom: "1px solid #e0e0e0", "& .MuiTab-root": { minHeight: 52, fontWeight: 600 } }}>
            {TABS.map((t, i) => (
              <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
            ))}
          </Tabs>

          <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#fff" }}>
            {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

            {/* TAB 0 — VENTAS */}
            {tab === 0 && (
              <Box>
                <SectionTitle>Resumen de ventas</SectionTitle>
                <Grid container spacing={2} sx={{ mb: 4 }}>
                  <Grid item xs={6} sm={3}>
                    <KpiCard label="Venta Total" value={fmt(sales?.total_revenue)} color="#1976d2" icon={<TrendingUpIcon />} />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <KpiCard label="Ticket Promedio" value={fmt(sales?.ticket_avg)} color="#43a047" icon={<AccountBalanceWalletIcon />} />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <KpiCard label="Órdenes Completadas" value={fmtNum(sales?.orders_count)} color="#e53935" icon={<AssignmentIcon />} />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <KpiCard label="Cobrado" value={fmt(sales?.total_collected)}
                      sub={`Pendiente: ${fmt(sales?.total_pending)}`} color="#fb8c00" icon={<LocalOfferIcon />} />
                  </Grid>
                </Grid>

                {/* Métodos de pago */}
                {sales?.payment_breakdown && Object.keys(sales.payment_breakdown).length > 0 && (
                  <>
                    <SectionTitle>Métodos de pago</SectionTitle>
                    <Grid container spacing={2} sx={{ mb: 4 }}>
                      {Object.entries(sales.payment_breakdown).map(([method, amount], i) => (
                        <Grid item xs={6} sm={3} key={method}>
                          <KpiCard label={method} value={fmt(amount)} color={COLORS[i % COLORS.length]} />
                        </Grid>
                      ))}
                    </Grid>
                  </>
                )}

                <SectionTitle>Ingresos por día</SectionTitle>
                {dailyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={dailyTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1976d2" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#1976d2" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={v => fmt(v)} />
                      <Area type="monotone" dataKey="revenue" stroke="#1976d2" strokeWidth={2}
                        fill="url(#salesGrad)" name="Ingresos" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <EmptyState />}
              </Box>
            )}

            {/* TAB 1 — ÓRDENES */}
            {tab === 1 && (
              <Box>
                <SectionTitle>Flujo operativo</SectionTitle>
                {orderFlow ? (
                  <>
                    <Grid container spacing={2} sx={{ mb: 4 }}>
                      {[
                        { label: "Total Creadas", val: orderFlow.total_orders, color: "#1976d2" },
                        { label: "En Proceso", val: orderFlow.in_process, color: "#fb8c00" },
                        { label: "Listas", val: orderFlow.ready, color: "#43a047" },
                        { label: "Entregadas", val: orderFlow.delivered, color: "#00acc1" },
                        { label: "Atrasadas", val: orderFlow.overdue, color: "#e53935" },
                        { label: "Tiempo Promedio (hrs)", val: orderFlow.avg_cycle_hours ? `${Number(orderFlow.avg_cycle_hours).toFixed(1)}h` : "—", color: "#8e24aa" },
                      ].map(({ label, val, color }) => (
                        <Grid item xs={6} sm={2} key={label}>
                          <KpiCard label={label} value={val ?? "—"} color={color} />
                        </Grid>
                      ))}
                    </Grid>

                    <SectionTitle>Ciclo de vida de la prenda</SectionTitle>
                    {orderFlow.funnel && orderFlow.funnel.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <FunnelChart>
                          <Tooltip formatter={v => fmtNum(v)} />
                          <Funnel dataKey="value" data={orderFlow.funnel} isAnimationActive>
                            <LabelList position="center" fill="#fff" stroke="none" dataKey="name"
                              style={{ fontSize: 13, fontWeight: 600 }} />
                            {orderFlow.funnel.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Funnel>
                        </FunnelChart>
                      </ResponsiveContainer>
                    ) : <EmptyState />}

                    <SectionTitle>Órdenes por tipo de servicio</SectionTitle>
                    {orderFlow.by_service && orderFlow.by_service.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={orderFlow.by_service} layout="vertical" margin={{ left: 60, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="service" tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="orders" fill="#1976d2" radius={[0, 4, 4, 0]} name="Órdenes" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyState />}
                  </>
                ) : <EmptyState />}
              </Box>
            )}

            {/* TAB 2 — CUENTAS POR COBRAR */}
            {tab === 2 && (
              <Box>
                <SectionTitle>Cartera pendiente</SectionTitle>
                {receivable ? (
                  <>
                    <Grid container spacing={2} sx={{ mb: 4 }}>
                      <Grid item xs={6} sm={3}>
                        <KpiCard label="Total por Cobrar" value={fmt(receivable.total_pending)} color="#e53935" icon={<AccountBalanceWalletIcon />} />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <KpiCard label="Órdenes Pendientes" value={fmtNum(receivable.pending_orders)} color="#fb8c00" icon={<AssignmentIcon />} />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <KpiCard label="Parcialmente Pagadas" value={fmtNum(receivable.partial_orders)} color="#8e24aa" />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <KpiCard label="% Cobrado al Recibir" value={`${Number(receivable.pct_paid_on_receive || 0).toFixed(0)}%`} color="#43a047" />
                      </Grid>
                    </Grid>

                    {receivable.pending_list && receivable.pending_list.length > 0 && (
                      <>
                        <SectionTitle>Detalle de órdenes pendientes</SectionTitle>
                        <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e0e0e0", borderRadius: 2 }}>
                          <Table size="small">
                            <TableHead sx={{ bgcolor: "#f5f7fa" }}>
                              <TableRow>
                                {["Folio", "Cliente", "Sucursal", "Fecha", "Total", "Pagado", "Saldo"].map(h => (
                                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>{h}</TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {receivable.pending_list.map(r => (
                                <TableRow key={r.id} hover>
                                  <TableCell>{r.folio}</TableCell>
                                  <TableCell>{r.client_name}</TableCell>
                                  <TableCell>{r.branch_name}</TableCell>
                                  <TableCell>{r.order_date?.slice(0, 10)}</TableCell>
                                  <TableCell>{fmt(r.total_amount)}</TableCell>
                                  <TableCell>{fmt(r.amount_paid)}</TableCell>
                                  <TableCell sx={{ color: "#e53935", fontWeight: 700 }}>
                                    {fmt(Number(r.total_amount) - Number(r.amount_paid))}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </>
                    )}
                  </>
                ) : <EmptyState />}
              </Box>
            )}

            {/* TAB 3 — CLIENTES */}
            {tab === 3 && (
              <Box>
                <SectionTitle>Análisis de clientes</SectionTitle>
                {clientsData ? (
                  <>
                    <Grid container spacing={2} sx={{ mb: 4 }}>
                      <Grid item xs={6} sm={3}>
                        <KpiCard label="Clientes Nuevos" value={fmtNum(clientsData.new_clients)} color="#43a047" icon={<PeopleAltIcon />} />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <KpiCard label="Clientes Recurrentes" value={fmtNum(clientsData.returning_clients)} color="#1976d2" icon={<PeopleAltIcon />} />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <KpiCard label="Ticket Promedio" value={fmt(clientsData.avg_ticket)} color="#fb8c00" />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <KpiCard label="% Recurrentes"
                          value={`${clientsData.new_clients + clientsData.returning_clients > 0
                            ? ((clientsData.returning_clients / (clientsData.new_clients + clientsData.returning_clients)) * 100).toFixed(0)
                            : 0}%`}
                          color="#8e24aa" />
                      </Grid>
                    </Grid>

                    <Grid container spacing={3} sx={{ mb: 4 }}>
                      <Grid item xs={12} md={6}>
                        <SectionTitle>Nuevos vs Recurrentes</SectionTitle>
                        {clientsData.new_clients + clientsData.returning_clients > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie data={[
                                { name: "Recurrentes", value: clientsData.returning_clients },
                                { name: "Nuevos", value: clientsData.new_clients },
                              ]} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                                <Cell fill="#1976d2" />
                                <Cell fill="#43a047" />
                              </Pie>
                              <Tooltip formatter={v => fmtNum(v)} />
                              <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : <EmptyState />}
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <SectionTitle>Top clientes por gasto</SectionTitle>
                        {clientsData.top_clients && clientsData.top_clients.length > 0 ? (
                          <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e0e0e0", borderRadius: 2 }}>
                            <Table size="small">
                              <TableHead sx={{ bgcolor: "#f5f7fa" }}>
                                <TableRow>
                                  {["#", "Cliente", "Órdenes", "Gasto Total"].map(h => (
                                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>{h}</TableCell>
                                  ))}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {clientsData.top_clients.map((c, i) => (
                                  <TableRow key={c.client_id} hover>
                                    <TableCell>{i + 1}</TableCell>
                                    <TableCell>{c.client_name}</TableCell>
                                    <TableCell>{fmtNum(c.orders)}</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#1976d2" }}>{fmt(c.total)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        ) : <EmptyState />}
                      </Grid>
                    </Grid>

                    {clientsData.inactive_clients && clientsData.inactive_clients.length > 0 && (
                      <>
                        <SectionTitle>Clientes sin visita en los últimos 60 días</SectionTitle>
                        <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e0e0e0", borderRadius: 2 }}>
                          <Table size="small">
                            <TableHead sx={{ bgcolor: "#f5f7fa" }}>
                              <TableRow>
                                {["Cliente", "Teléfono", "Última Visita", "Órdenes Totales"].map(h => (
                                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>{h}</TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {clientsData.inactive_clients.slice(0, 20).map(c => (
                                <TableRow key={c.client_id} hover>
                                  <TableCell>{c.client_name}</TableCell>
                                  <TableCell>{c.phone}</TableCell>
                                  <TableCell>{c.last_order?.slice(0, 10)}</TableCell>
                                  <TableCell>{fmtNum(c.total_orders)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </>
                    )}
                  </>
                ) : <EmptyState />}
              </Box>
            )}

            {/* TAB 4 — PRENDAS */}
            {tab === 4 && (
              <Box>
                <SectionTitle>Servicios y prendas más vendidas</SectionTitle>
                {topItems.length > 0 ? (
                  <>
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <SectionTitle>Top 10 por cantidad</SectionTitle>
                        <Box sx={{ width: "100%", height: 340 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topItems.slice(0, 10).map(d => ({ ...d, short_name: d.item_name.length > 22 ? d.item_name.slice(0, 22) + "…" : d.item_name }))} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="short_name" tick={{ fontSize: 12 }} width={185} />
                            <Tooltip formatter={v => fmtNum(v)} labelFormatter={(_, p) => p?.[0]?.payload?.item_name || ""} />
                            <Bar dataKey="total_qty" radius={[0, 4, 4, 0]} name="Cantidad">
                              {topItems.slice(0, 10).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        </Box>
                      </Grid>
                      <Grid item xs={12}>
                        <SectionTitle>Top 10 por ingreso</SectionTitle>
                        <Box sx={{ width: "100%", height: 340 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topItems.slice(0, 10).map(d => ({ ...d, short_name: d.item_name.length > 22 ? d.item_name.slice(0, 22) + "…" : d.item_name }))} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                            <YAxis type="category" dataKey="short_name" tick={{ fontSize: 12 }} width={185} />
                            <Tooltip formatter={v => fmt(v)} labelFormatter={(_, p) => p?.[0]?.payload?.item_name || ""} />
                            <Bar dataKey="total_revenue" radius={[0, 4, 4, 0]} name="Ingreso">
                              {topItems.slice(0, 10).map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        </Box>
                      </Grid>
                    </Grid>

                    <Box sx={{ mt: 3 }}>
                      <SectionTitle>Tabla completa</SectionTitle>
                      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e0e0e0", borderRadius: 2 }}>
                        <Table size="small">
                          <TableHead sx={{ bgcolor: "#f5f7fa" }}>
                            <TableRow>
                              {["#", "Servicio/Prenda", "Cantidad", "Ingreso Total", "Ticket Promedio"].map(h => (
                                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>{h}</TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {topItems.map((r, i) => (
                              <TableRow key={r.item_id} hover>
                                <TableCell>{i + 1}</TableCell>
                                <TableCell>{r.item_name}</TableCell>
                                <TableCell>{fmtNum(r.total_qty)}</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#1976d2" }}>{fmt(r.total_revenue)}</TableCell>
                                <TableCell>{r.total_qty > 0 ? fmt(r.total_revenue / r.total_qty) : "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  </>
                ) : <EmptyState />}
              </Box>
            )}

            {/* TAB 5 — DESCUENTOS */}
            {tab === 5 && (
              <Box>
                <SectionTitle>Impacto de descuentos y promociones</SectionTitle>
                {discounts ? (
                  <>
                    <Grid container spacing={2} sx={{ mb: 4 }}>
                      <Grid item xs={6} sm={3}>
                        <KpiCard label="Total Descontado" value={fmt(discounts.total_discounted)} color="#e53935" />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <KpiCard label="Venta Bruta" value={fmt(discounts.gross_revenue)} color="#1976d2" />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <KpiCard label="% de Descuento" value={`${Number(discounts.discount_pct || 0).toFixed(1)}%`} color="#fb8c00" />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <KpiCard label="Órdenes con Descuento" value={fmtNum(discounts.orders_with_discount)} color="#8e24aa" />
                      </Grid>
                    </Grid>

                    {discounts.by_promotion && discounts.by_promotion.length > 0 && (
                      <>
                        <SectionTitle>Rendimiento por promoción</SectionTitle>
                        <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e0e0e0", borderRadius: 2 }}>
                          <Table size="small">
                            <TableHead sx={{ bgcolor: "#f5f7fa" }}>
                              <TableRow>
                                {["Promoción", "Veces Usada", "Ahorro Cliente", "Ingreso Generado"].map(h => (
                                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>{h}</TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {discounts.by_promotion.map(p => (
                                <TableRow key={p.promo_id} hover>
                                  <TableCell>{p.promo_title}</TableCell>
                                  <TableCell>{fmtNum(p.times_used)}</TableCell>
                                  <TableCell sx={{ color: "#e53935" }}>{fmt(p.total_discount)}</TableCell>
                                  <TableCell sx={{ fontWeight: 700, color: "#43a047" }}>{fmt(p.revenue)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </>
                    )}

                    {discounts.points_redeemed !== undefined && (
                      <Box sx={{ mt: 3 }}>
                        <SectionTitle>Puntos</SectionTitle>
                        <Grid container spacing={2}>
                          <Grid item xs={6} sm={3}>
                            <KpiCard label="Puntos Canjeados" value={fmtNum(discounts.points_redeemed)} color="#00acc1" />
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <KpiCard label="Valor de Puntos" value={fmt(discounts.points_value)} color="#00acc1" />
                          </Grid>
                        </Grid>
                      </Box>
                    )}
                  </>
                ) : <EmptyState />}
              </Box>
            )}

            {/* TAB 6 — SUCURSALES */}
            {tab === 6 && (
              <Box>
                <SectionTitle>Comparativo por sucursal</SectionTitle>
                {byBranch.length > 0 ? (
                  <>
                    <Grid container spacing={2} sx={{ mb: 4 }}>
                      {byBranch.map((b, i) => (
                        <Grid item xs={12} sm={6} md={4} key={b.branch_id}>
                          <Card elevation={2} sx={{ borderRadius: 3, borderLeft: `4px solid ${COLORS[i % COLORS.length]}` }}>
                            <CardContent>
                              <Typography fontWeight={700}>{b.branch_name}</Typography>
                              <Divider sx={{ my: 1 }} />
                              <Grid container spacing={1}>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Ventas</Typography>
                                  <Typography fontWeight={700} color={COLORS[i % COLORS.length]}>{fmt(b.revenue)}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Órdenes</Typography>
                                  <Typography fontWeight={700}>{fmtNum(b.orders)}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Ticket Prom.</Typography>
                                  <Typography fontWeight={700}>{fmt(b.avg_ticket)}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Entregadas</Typography>
                                  <Typography fontWeight={700}>{fmtNum(b.delivered)}</Typography>
                                </Grid>
                              </Grid>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>

                    <SectionTitle>Comparativo de ingresos</SectionTitle>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={byBranch} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="branch_name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={v => fmt(v)} />
                        <Bar dataKey="revenue" name="Ingresos" radius={[6, 6, 0, 0]}>
                          {byBranch.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </>
                ) : (
                  <EmptyState text={isBA ? "Sin datos por sucursal" : "Este reporte solo está disponible para administradores del negocio"} />
                )}
              </Box>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
