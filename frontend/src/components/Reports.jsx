import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, Grid, Button, TextField, MenuItem,
  IconButton, CircularProgress, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, Divider,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ReceiptIcon from "@mui/icons-material/Receipt";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
  ScatterChart, Scatter, RadialBarChart, RadialBar,
  FunnelChart, Funnel, LabelList,
} from "recharts";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

const FUNNEL_STAGES = [
  { key: "Pendiente",      label: "Recepción",         color: "#90a4ae" },
  { key: "En Proceso",     label: "Lavado",             color: "#42a5f5" },
  { key: "En Producción",  label: "Planchado/Acabado",  color: "#ab47bc" },
  { key: "Listo",          label: "Listo para entregar",color: "#66bb6a" },
  { key: "Entregado",      label: "Entregado",          color: "#1976d2" },
];

const CAT_LABELS = {
  quimicos: "Químicos", detergentes: "Detergentes",
  consumibles: "Consumibles", utilities: "Utilities", otros: "Otros",
};

const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const fmtCurrency = (v) =>
  Number(v || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

function BigNumber({ label, value, sub, color, icon: Icon }) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 2, borderTop: `4px solid ${color || "#1976d2"}`, height: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        {Icon && <Icon sx={{ color: color || "#1976d2", fontSize: 20 }} />}
        <Typography variant="caption" color="text.secondary">{label}</Typography>
      </Box>
      <Typography variant="h4" fontWeight={800} sx={{ color: color || "text.primary", lineHeight: 1 }}>{value}</Typography>
      {sub && <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>{sub}</Typography>}
    </Paper>
  );
}

function AlertBadge({ alert }) {
  return <Alert severity={{ error: "error", warning: "warning", success: "success" }[alert.level] || "info"} sx={{ py: 0.5 }}>{alert.message}</Alert>;
}

const GaugeCard = ({ value, goal, month }) => {
  const pct = goal > 0 ? Math.min(Math.round((value / goal) * 100), 100) : 0;
  const color = pct >= 100 ? "#43a047" : pct >= 70 ? "#fb8c00" : "#e53935";
  const data = [{ value: pct, fill: color }];
  return (
    <Paper sx={{ p: 2.5, borderRadius: 2, borderTop: `4px solid ${color}`, height: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Typography variant="caption" color="text.secondary">Meta del mes — {month}</Typography>
      {goal > 0 ? (
        <>
          <RadialBarChart width={200} height={120} cx={100} cy={110} innerRadius={70} outerRadius={98}
            startAngle={180} endAngle={0} data={data} barSize={20}>
            <RadialBar background dataKey="value" cornerRadius={6} />
          </RadialBarChart>
          <Box sx={{ mt: -2, textAlign: "center" }}>
            <Typography variant="h4" fontWeight={800} sx={{ color }}>{pct}%</Typography>
            <Typography variant="caption" color="text.secondary">
              {fmtCurrency(value)} / {fmtCurrency(goal)}
            </Typography>
          </Box>
        </>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: "center" }}>
          Sin meta. Usa "Configurar Metas".
        </Typography>
      )}
    </Paper>
  );
};

export default function Reports() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");
  const role = localStorage.getItem("role");
  const branchIdStored = localStorage.getItem("branch_id");
  const now = new Date();

  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultTo = now.toISOString().split("T")[0];

  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(
    role === "branch_manager" ? branchIdStored || "" : ""
  );
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [applied, setApplied] = useState({ branch: selectedBranch, from: defaultFrom, to: defaultTo });

  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [retention, setRetention] = useState(null);
  const [expSummary, setExpSummary] = useState([]);
  const [dailyExp, setDailyExp] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);

  const [goalDialog, setGoalDialog] = useState(false);
  const [goalYear, setGoalYear] = useState(now.getFullYear());
  const [goalMonth, setGoalMonth] = useState(now.getMonth() + 1);
  const [goalGlobal, setGoalGlobal] = useState("");
  const [goalBranches, setGoalBranches] = useState({});
  const [goalSaving, setGoalSaving] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const buildParams = useCallback((extra = {}) => {
    const p = new URLSearchParams({ date_from: applied.from, date_to: applied.to, ...extra });
    if (applied.branch) p.set("branch_id", applied.branch);
    return p.toString();
  }, [applied]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2, r3, r4, r5, r6, r7, r8] = await Promise.all([
        fetch(`${API}/api/v1/reports/summary?${buildParams()}`, { headers }),
        fetch(`${API}/api/v1/reports/daily-trend?${buildParams()}`, { headers }),
        fetch(`${API}/api/v1/reports/top-items?${buildParams()}`, { headers }),
        fetch(`${API}/api/v1/reports/client-retention?${buildParams()}`, { headers }),
        fetch(`${API}/api/v1/reports/expenses-summary?${buildParams()}`, { headers }),
        fetch(`${API}/api/v1/reports/daily-expenses?${buildParams()}`, { headers }),
        fetch(`${API}/api/v1/reports/alerts?${applied.branch ? `branch_id=${applied.branch}` : ""}`, { headers }),
        fetch(`${API}/api/v1/goals?year=${now.getFullYear()}&month=${now.getMonth() + 1}${applied.branch ? `&branch_id=${applied.branch}` : ""}`, { headers }),
      ]);
      if (r1.ok) setSummary(await r1.json());
      if (r2.ok) setDaily((await r2.json()).data || []);
      if (r3.ok) setTopItems((await r3.json()).data || []);
      if (r4.ok) setRetention(await r4.json());
      if (r5.ok) setExpSummary((await r5.json()).data || []);
      if (r6.ok) setDailyExp((await r6.json()).data || []);
      if (r7.ok) setAlerts((await r7.json()).alerts || []);
      if (r8.ok) {
        const gd = await r8.json();
        setGoal(applied.branch ? gd.branch : gd.global);
      }
    } catch {}
    setLoading(false);
  }, [buildParams, applied]);

  useEffect(() => {
    const load = async () => {
      try {
        const claims = JSON.parse(atob(token.split(".")[1]));
        const r = await fetch(`${API}/businesses/${claims.business_id}/branches`, { headers });
        if (r.ok) { const d = await r.json(); setBranches(Array.isArray(d) ? d : d.branches || []); }
      } catch {}
    };
    load();
  }, []);

  useEffect(() => { fetchAll(); }, [applied]);

  const openGoalDialog = async () => {
    const branchArr = Array.isArray(branches) ? branches : [];
    const init = {};
    branchArr.forEach((b) => { init[b.id] = ""; });
    setGoalBranches(init);
    setGoalGlobal("");
    try {
      const r = await fetch(`${API}/api/v1/goals?year=${goalYear}&month=${goalMonth}`, { headers });
      if (r.ok) {
        const d = await r.json();
        if (d.global) setGoalGlobal(d.global.goal_amount);
        for (const b of branchArr) {
          const r2 = await fetch(`${API}/api/v1/goals?year=${goalYear}&month=${goalMonth}&branch_id=${b.id}`, { headers });
          if (r2.ok) { const d2 = await r2.json(); if (d2.branch) setGoalBranches((p) => ({ ...p, [b.id]: d2.branch.goal_amount })); }
        }
      }
    } catch {}
    setGoalDialog(true);
  };

  const saveGoals = async () => {
    setGoalSaving(true);
    const jh = { ...headers, "Content-Type": "application/json" };
    try {
      if (goalGlobal !== "") await fetch(`${API}/api/v1/goals`, { method: "POST", headers: jh, body: JSON.stringify({ year: goalYear, month: goalMonth, branch_id: null, goal_amount: Number(goalGlobal) }) });
      for (const [bid, amt] of Object.entries(goalBranches)) {
        if (amt !== "") await fetch(`${API}/api/v1/goals`, { method: "POST", headers: jh, body: JSON.stringify({ year: goalYear, month: goalMonth, branch_id: Number(bid), goal_amount: Number(amt) }) });
      }
      setGoalDialog(false);
      fetchAll();
    } catch {}
    setGoalSaving(false);
  };

  const statuses = summary?.orders_by_status || {};
  const pendingCount = (statuses["Pendiente"] || 0) + (statuses["En Proceso"] || 0) + (statuses["En Producción"] || 0);
  const readyCount = (statuses["Listo"] || 0) + (statuses["Entregado"] || 0);
  const stackedData = [{ name: "Prendas", Pendientes: pendingCount, Listas: readyCount }];

  const funnelData = FUNNEL_STAGES.map((s) => ({
    name: s.label,
    value: statuses[s.key] || 0,
    fill: s.color,
  })).filter((d) => d.value > 0);

  const scatterData = daily.map((d) => {
    const expDay = dailyExp.find((e) => e.day === d.day);
    return { prendas: d.orders, insumos: expDay ? expDay.quimicos_utilities : 0, day: d.day };
  }).filter((d) => d.prendas > 0);

  const retentionData = retention
    ? [
        { name: "Recurrentes", value: retention.recurring, fill: "#1976d2" },
        { name: "Nuevos", value: retention.new, fill: "#43a047" },
      ]
    : [];

  const expChartData = expSummary.map((r) => ({ name: CAT_LABELS[r.category] || r.category, total: r.total }));
  const branchArr = Array.isArray(branches) ? branches : [];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1300, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton onClick={() => navigate(-1)} size="small"><ArrowBackIcon /></IconButton>
          <Typography variant="h5" fontWeight={700}>Reportes Ejecutivos</Typography>
        </Box>
        <Button startIcon={<SettingsIcon />} variant="outlined" size="small" onClick={openGoalDialog}>
          Configurar Metas
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          {role !== "branch_manager" && (
            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
              <TextField select fullWidth label="Sucursal" size="small" value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}>
                <MenuItem value="">Todas las sucursales</MenuItem>
                {branchArr.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </TextField>
            </Grid>
          )}
          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <TextField fullWidth label="Desde" type="date" size="small" InputLabelProps={{ shrink: true }}
              value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <TextField fullWidth label="Hasta" type="date" size="small" InputLabelProps={{ shrink: true }}
              value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 2, md: 1.5 }}>
            <Button fullWidth variant="contained" startIcon={<SearchIcon />} onClick={() => setApplied({ branch: selectedBranch, from: dateFrom, to: dateTo })}>
              Aplicar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ textAlign: "center", py: 8 }}><CircularProgress size={48} /></Box>
      ) : (
        <>
          {/* ── PANEL DE CONTROL ── */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {/* Gauge */}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <GaugeCard value={summary?.total_revenue || 0} goal={goal ? Number(goal.goal_amount) : 0} month={MONTHS[now.getMonth()]} />
            </Grid>

            {/* Ticket Promedio */}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <BigNumber
                label="Ticket Promedio"
                value={fmtCurrency(summary?.ticket_avg)}
                sub={`${summary?.orders_count || 0} órdenes en el período`}
                color="#fb8c00"
                icon={ReceiptIcon}
              />
            </Grid>

            {/* Barras Apiladas: Inventario en tiempo real */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 2.5, borderRadius: 2, borderTop: "4px solid #43a047", height: "100%" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <TrendingUpIcon sx={{ color: "#43a047", fontSize: 20 }} />
                  <Typography variant="caption" color="text.secondary">Inventario en Tiempo Real</Typography>
                </Box>
                <ResponsiveContainer width="100%" height={90}>
                  <BarChart data={stackedData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" hide />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Pendientes" stackId="a" fill="#e53935" radius={[4, 0, 0, 4]} />
                    <Bar dataKey="Listas" stackId="a" fill="#43a047" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                  <Chip size="small" label={`${pendingCount} en proceso`} sx={{ bgcolor: "#ffebee", color: "#e53935", fontSize: 11 }} />
                  <Chip size="small" label={`${readyCount} listas`} sx={{ bgcolor: "#e8f5e9", color: "#43a047", fontSize: 11 }} />
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* ── FUNNEL: CICLO DE VIDA ── */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>Ciclo de Vida de la Prenda</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
              Si una sección del embudo se estrecha, ahí se está "atascando" la ropa.
            </Typography>
            {funnelData.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>Sin órdenes activas en el período</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <FunnelChart>
                  <Tooltip formatter={(v) => [`${v} órdenes`, ""]} />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive>
                    <LabelList position="right" fill="#333" stroke="none" dataKey="name"
                      style={{ fontSize: 12, fontWeight: 600 }} />
                    <LabelList position="center" fill="#fff" stroke="none" dataKey="value"
                      style={{ fontSize: 14, fontWeight: 800 }} />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            )}
          </Paper>

          {/* ── SCATTER + DONUT ── */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {/* Scatter: Prendas vs Insumos */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper sx={{ p: 3, borderRadius: 2, height: "100%" }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>Eficiencia de Insumos</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                  Cada punto = un día. Línea diagonal = eficiencia normal. Punto disparado = posible desperdicio o robo.
                </Typography>
                {scatterData.length === 0 ? (
                  <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                    Sin datos. Registra gastos de químicos/utilities para ver este gráfico.
                  </Typography>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <ScatterChart margin={{ bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="prendas" name="Órdenes" type="number" tick={{ fontSize: 11 }}
                        label={{ value: "Órdenes / día", position: "insideBottom", offset: -10, fontSize: 11 }} />
                      <YAxis dataKey="insumos" name="Químicos+Utilities" type="number" tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                        label={{ value: "Gasto ($)", angle: -90, position: "insideLeft", fontSize: 11 }} />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        content={({ payload }) => {
                          if (!payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <Paper sx={{ p: 1, fontSize: 12 }}>
                              <div><b>{d.day}</b></div>
                              <div>Órdenes: {d.prendas}</div>
                              <div>Insumos: {fmtCurrency(d.insumos)}</div>
                            </Paper>
                          );
                        }}
                      />
                      <Scatter data={scatterData} fill="#ab47bc" opacity={0.8} />
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>

            {/* Donut: Retención */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper sx={{ p: 3, borderRadius: 2, height: "100%" }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>Salud del Cliente</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                  Tintorería sana: 70%+ recurrentes. Más nuevos que viejos = posible problema de servicio.
                </Typography>
                {!retention || retention.total === 0 ? (
                  <Typography color="text.secondary" align="center" sx={{ py: 4 }}>Sin datos</Typography>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={retentionData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                          dataKey="value" nameKey="name"
                          label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                          labelLine={false}>
                          {retentionData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
                      <Chip size="small" label={`Recurrentes: ${retention.recurring}`} sx={{ bgcolor: "#e3f2fd", color: "#1976d2" }} />
                      <Chip size="small" label={`Nuevos: ${retention.new}`} sx={{ bgcolor: "#e8f5e9", color: "#43a047" }} />
                    </Box>
                  </>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* ── TOP SERVICIOS + GASTOS ── */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Top 10 Servicios</Typography>
                {topItems.length === 0 ? (
                  <Typography color="text.secondary" align="center" sx={{ py: 4 }}>Sin datos</Typography>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={topItems} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="item_name" type="category" width={130} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="qty" name="Cantidad" radius={[0, 4, 4, 0]}>
                        {topItems.map((_, i) => <Cell key={i} fill={["#1976d2","#43a047","#fb8c00","#e53935","#8e24aa","#00acc1"][i % 6]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Gastos por Categoría</Typography>
                {expChartData.length === 0 ? (
                  <Typography color="text.secondary" align="center" sx={{ py: 4 }}>Sin gastos en el período</Typography>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={expChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => fmtCurrency(v)} />
                      <Bar dataKey="total" name="Gasto" radius={[0, 4, 4, 0]}>
                        {expChartData.map((_, i) => <Cell key={i} fill={["#ab47bc","#42a5f5","#66bb6a","#ffa726","#78909c"][i % 5]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* ── SEMÁFORO DE ALERTAS ── */}
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Semáforo de Alertas</Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {alerts.length === 0
                ? <Alert severity="success">Sin alertas — operación al día</Alert>
                : alerts.map((a, i) => <AlertBadge key={i} alert={a} />)}
            </Box>
          </Paper>
        </>
      )}

      {/* Goal Dialog */}
      <Dialog open={goalDialog} onClose={() => setGoalDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configurar Metas de Venta</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 6 }}>
              <TextField select fullWidth label="Año" size="small" value={goalYear}
                onChange={(e) => setGoalYear(Number(e.target.value))}>
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) =>
                  <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField select fullWidth label="Mes" size="small" value={goalMonth}
                onChange={(e) => setGoalMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Meta Global (todo el negocio)</Typography>
              <TextField fullWidth label="Meta global ($)" type="number" size="small" value={goalGlobal}
                onChange={(e) => setGoalGlobal(e.target.value)} />
            </Grid>
            {branchArr.length > 0 && (
              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Meta por Sucursal</Typography>
                <Grid container spacing={1.5}>
                  {branchArr.map((b) => (
                    <Grid key={b.id} size={{ xs: 12, sm: 6 }}>
                      <TextField fullWidth label={b.name} type="number" size="small"
                        value={goalBranches[b.id] || ""}
                        onChange={(e) => setGoalBranches((p) => ({ ...p, [b.id]: e.target.value }))} />
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGoalDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={saveGoals} disabled={goalSaving}>
            {goalSaving ? <CircularProgress size={20} /> : "Guardar metas"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
