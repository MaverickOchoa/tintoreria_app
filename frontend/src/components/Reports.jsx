import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, Grid, Button, TextField, MenuItem,
  IconButton, CircularProgress, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, Divider,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import TuneIcon from "@mui/icons-material/Tune";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  LineChart, Line, AreaChart, Area,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter, RadialBarChart, RadialBar,
} from "recharts";

const API = "http://127.0.0.1:5000";
const COLORS = ["#1976d2", "#43a047", "#fb8c00", "#e53935", "#8e24aa", "#00acc1"];
const CAT_LABELS = {
  quimicos: "Químicos",
  detergentes: "Detergentes",
  consumibles: "Consumibles",
  utilities: "Utilities",
  otros: "Otros",
};

const fmtCurrency = (v) =>
  Number(v || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

function KpiCard({ label, value, sub, color }) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 2, borderTop: `4px solid ${color || "#1976d2"}`, height: "100%" }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, color: color || "text.primary" }}>{value}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Paper>
  );
}

function AlertBadge({ alert }) {
  const map = { error: "error", warning: "warning", success: "success" };
  return <Alert severity={map[alert.level] || "info"} sx={{ py: 0.5 }}>{alert.message}</Alert>;
}

const GaugeChart = ({ value, goal }) => {
  const pct = goal > 0 ? Math.min(Math.round((value / goal) * 100), 100) : 0;
  const data = [{ name: "Avance", value: pct, fill: pct >= 100 ? "#43a047" : pct >= 70 ? "#fb8c00" : "#e53935" }];
  return (
    <Box sx={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <RadialBarChart width={220} height={130} cx={110} cy={120} innerRadius={80} outerRadius={110}
        startAngle={180} endAngle={0} data={data} barSize={22}>
        <RadialBar background dataKey="value" cornerRadius={6} />
      </RadialBarChart>
      <Box sx={{ position: "absolute", bottom: 4, textAlign: "center" }}>
        <Typography variant="h4" fontWeight={800}>{pct}%</Typography>
        <Typography variant="caption" color="text.secondary">
          {fmtCurrency(value)} / {fmtCurrency(goal)}
        </Typography>
      </Box>
    </Box>
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
  const [byBranch, setByBranch] = useState([]);
  const [expSummary, setExpSummary] = useState([]);
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
    const p = new URLSearchParams({
      date_from: applied.from,
      date_to: applied.to,
      ...extra,
    });
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
        fetch(`${API}/api/v1/reports/by-branch?${buildParams()}`, { headers }),
        fetch(`${API}/api/v1/reports/expenses-summary?${buildParams()}`, { headers }),
        fetch(`${API}/api/v1/reports/alerts?${applied.branch ? `branch_id=${applied.branch}` : ""}`, { headers }),
        fetch(`${API}/api/v1/goals?year=${now.getFullYear()}&month=${now.getMonth() + 1}${applied.branch ? `&branch_id=${applied.branch}` : ""}`, { headers }),
      ]);
      if (r1.ok) setSummary(await r1.json());
      if (r2.ok) setDaily((await r2.json()).data);
      if (r3.ok) setTopItems((await r3.json()).data);
      if (r4.ok) setRetention(await r4.json());
      if (r5.ok) setByBranch((await r5.json()).data);
      if (r6.ok) setExpSummary((await r6.json()).data);
      if (r7.ok) setAlerts((await r7.json()).alerts || []);
      if (r8.ok) {
        const gd = await r8.json();
        const active = applied.branch ? gd.branch : gd.global;
        setGoal(active);
      }
    } catch {}
    setLoading(false);
  }, [buildParams, applied]);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const claims = JSON.parse(atob(token.split(".")[1]));
        const r = await fetch(`${API}/businesses/${claims.business_id}/branches`, { headers });
        if (r.ok) setBranches(await r.json());
      } catch {}
    };
    loadBranches();
  }, []);

  useEffect(() => { fetchAll(); }, [applied]);

  const handleApply = () => {
    setApplied({ branch: selectedBranch, from: dateFrom, to: dateTo });
  };

  const openGoalDialog = async () => {
    const init = {};
    branches.forEach((b) => { init[b.id] = ""; });
    setGoalBranches(init);
    setGoalGlobal("");
    try {
      const r = await fetch(`${API}/api/v1/goals?year=${goalYear}&month=${goalMonth}`, { headers });
      if (r.ok) {
        const d = await r.json();
        if (d.global) setGoalGlobal(d.global.goal_amount);
        for (const b of branches) {
          const r2 = await fetch(`${API}/api/v1/goals?year=${goalYear}&month=${goalMonth}&branch_id=${b.id}`, { headers });
          if (r2.ok) {
            const d2 = await r2.json();
            if (d2.branch) setGoalBranches((prev) => ({ ...prev, [b.id]: d2.branch.goal_amount }));
          }
        }
      }
    } catch {}
    setGoalDialog(true);
  };

  const saveGoals = async () => {
    setGoalSaving(true);
    const jheaders = { ...headers, "Content-Type": "application/json" };
    try {
      if (goalGlobal !== "") {
        await fetch(`${API}/api/v1/goals`, {
          method: "POST", headers: jheaders,
          body: JSON.stringify({ year: goalYear, month: goalMonth, branch_id: null, goal_amount: Number(goalGlobal) }),
        });
      }
      for (const [bid, amt] of Object.entries(goalBranches)) {
        if (amt !== "") {
          await fetch(`${API}/api/v1/goals`, {
            method: "POST", headers: jheaders,
            body: JSON.stringify({ year: goalYear, month: goalMonth, branch_id: Number(bid), goal_amount: Number(amt) }),
          });
        }
      }
      setGoalDialog(false);
      fetchAll();
    } catch {}
    setGoalSaving(false);
  };

  const retentionData = retention
    ? [
        { name: "Recurrentes", value: retention.recurring, fill: "#1976d2" },
        { name: "Nuevos", value: retention.new, fill: "#43a047" },
      ]
    : [];

  const expChartData = expSummary.map((r) => ({
    name: CAT_LABELS[r.category] || r.category,
    total: r.total,
  }));

  const scatterData = daily.map((d) => {
    const expDay = expSummary.find(() => false); // placeholder — no daily expense data by default
    return { orders: d.orders, revenue: d.revenue, day: d.day };
  });

  return (
    <Box sx={{ p: 3, maxWidth: 1300, mx: "auto" }}>
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
                {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
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
            <Button fullWidth variant="contained" startIcon={<SearchIcon />} onClick={handleApply}>
              Aplicar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ textAlign: "center", py: 8 }}><CircularProgress size={48} /></Box>
      ) : (
        <>
          {/* KPI Cards + Gauge */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <KpiCard label="Venta Total" value={fmtCurrency(summary?.total_revenue)} color="#1976d2" />
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <KpiCard label="Ticket Promedio" value={fmtCurrency(summary?.ticket_avg)} color="#fb8c00"
                sub={`${summary?.orders_count || 0} órdenes`} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <KpiCard label="Completadas" value={summary?.completed || 0} color="#43a047"
                sub="Órdenes entregadas" />
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <KpiCard label="Pendientes" value={summary?.pending || 0} color="#e53935"
                sub="En proceso" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Paper sx={{ p: 2, borderRadius: 2, height: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Typography variant="caption" color="text.secondary">Meta del mes — {MONTHS[now.getMonth()]}</Typography>
                {goal ? (
                  <GaugeChart value={summary?.total_revenue || 0} goal={Number(goal.goal_amount)} />
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Sin meta configurada. Usa "Configurar Metas".
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* Payment breakdown */}
          {summary?.payment_breakdown && (
            <Box sx={{ mb: 3, display: "flex", gap: 1, flexWrap: "wrap" }}>
              {Object.entries(summary.payment_breakdown).map(([method, amount]) => (
                <Chip key={method} label={`${method}: ${fmtCurrency(amount)}`}
                  color={method === "cash" ? "success" : method === "card" ? "primary" : "default"}
                  variant="outlined" />
              ))}
            </Box>
          )}

          {/* Line chart: Ingresos por día */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Ingresos por Día</Typography>
            {daily.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>Sin datos en el período</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={daily}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1976d2" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1976d2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => fmtCurrency(v)} />
                  <Area type="monotone" dataKey="revenue" stroke="#1976d2" fill="url(#rev)" strokeWidth={2} name="Ingresos" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Paper>

          {/* Donut + By Branch */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 3, borderRadius: 2, height: "100%" }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Retención de Clientes</Typography>
                {retention?.total === 0 ? (
                  <Typography color="text.secondary" align="center" sx={{ py: 4 }}>Sin datos</Typography>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={retentionData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                          dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}>
                          {retentionData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 1 }}>
                      <Chip label={`Recurrentes: ${retention?.recurring || 0}`} size="small" sx={{ bgcolor: "#1976d222", color: "#1976d2" }} />
                      <Chip label={`Nuevos: ${retention?.new || 0}`} size="small" sx={{ bgcolor: "#43a04722", color: "#43a047" }} />
                    </Box>
                  </>
                )}
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <Paper sx={{ p: 3, borderRadius: 2, height: "100%" }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Ingresos por Sucursal</Typography>
                {byBranch.length === 0 ? (
                  <Typography color="text.secondary" align="center" sx={{ py: 4 }}>Sin datos</Typography>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={byBranch}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="branch_name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => fmtCurrency(v)} />
                      <Bar dataKey="revenue" fill="#1976d2" radius={[4, 4, 0, 0]} name="Ingresos">
                        {byBranch.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* Scatter: órdenes vs ingresos por día */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Dispersión: Órdenes vs Ingresos por Día</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
              Cada punto es un día. Si sigue una línea diagonal, la operación es estable.
            </Typography>
            {daily.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>Sin datos en el período</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="orders" name="Órdenes" type="number" tick={{ fontSize: 11 }} label={{ value: "Órdenes/día", position: "insideBottom", offset: -2, fontSize: 11 }} />
                  <YAxis dataKey="revenue" name="Ingresos" type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }}
                    formatter={(v, name) => name === "revenue" ? fmtCurrency(v) : v}
                    labelFormatter={() => ""} />
                  <Scatter data={daily} fill="#1976d2" opacity={0.7} />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </Paper>

          {/* Top Items + Expenses by category */}
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
                      <Bar dataKey="qty" fill="#fb8c00" radius={[0, 4, 4, 0]} name="Cantidad">
                        {topItems.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
                  <Typography color="text.secondary" align="center" sx={{ py: 4 }}>Sin gastos registrados en el período</Typography>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={expChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => fmtCurrency(v)} />
                      <Bar dataKey="total" radius={[0, 4, 4, 0]} name="Gasto">
                        {expChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* Alerts */}
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

      {/* Goal Config Dialog */}
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
                onChange={(e) => setGoalGlobal(e.target.value)}
                InputProps={{ startAdornment: <Typography sx={{ mr: 1 }}>$</Typography> }} />
            </Grid>
            {branches.length > 0 && (
              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Meta por Sucursal</Typography>
                <Grid container spacing={1.5}>
                  {branches.map((b) => (
                    <Grid key={b.id} size={{ xs: 12, sm: 6 }}>
                      <TextField fullWidth label={b.name} type="number" size="small"
                        value={goalBranches[b.id] || ""}
                        onChange={(e) => setGoalBranches((prev) => ({ ...prev, [b.id]: e.target.value }))}
                        InputProps={{ startAdornment: <Typography sx={{ mr: 1 }}>$</Typography> }} />
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
