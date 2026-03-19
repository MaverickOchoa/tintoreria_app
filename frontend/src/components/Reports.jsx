import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, Grid, Button, TextField, MenuItem,
  IconButton, CircularProgress, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, Divider, Tabs, Tab,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  LinearProgress, Tooltip as MuiTooltip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import TodayIcon from "@mui/icons-material/Today";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CakeIcon from "@mui/icons-material/Cake";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import StorefrontIcon from "@mui/icons-material/Storefront";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, FunnelChart, Funnel, LabelList,
} from "recharts";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

const FUNNEL_STAGES = [
  { key: "Pendiente",     label: "Recepción",          color: "#90a4ae" },
  { key: "En Proceso",    label: "Lavado",              color: "#42a5f5" },
  { key: "En Producción", label: "Planchado / Acabado", color: "#ab47bc" },
  { key: "Listo",         label: "Listo para entregar", color: "#66bb6a" },
  { key: "Entregado",     label: "Entregado",           color: "#1976d2" },
];

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const CAT_LABELS = { quimicos:"Químicos", detergentes:"Detergentes",
                     consumibles:"Consumibles", utilities:"Utilities", otros:"Otros" };

const COLORS6 = ["#1976d2","#43a047","#fb8c00","#e53935","#8e24aa","#00acc1"];

const fmt = (v) => Number(v||0).toLocaleString("es-MX",{style:"currency",currency:"MXN"});
const fmtN = (v) => Number(v||0).toLocaleString("es-MX");

const STATUS_COLOR = {
  "Pendiente":"#90a4ae","En Proceso":"#42a5f5",
  "En Producción":"#ab47bc","Listo":"#66bb6a",
  "Entregado":"#1976d2","Cancelado":"#e53935",
};

// ─── Reusable KPI card ───────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color="#1976d2", danger=false }) {
  return (
    <Paper elevation={0} sx={{
      p: 2.5, borderRadius: 3, border: "1px solid", height: "100%",
      borderColor: danger ? "#ffcdd2" : "#e0e0e0",
      bgcolor: danger ? "#fff8f8" : "#fff",
    }}>
      <Box sx={{ display:"flex", alignItems:"center", gap: 1, mb: 1 }}>
        <Box sx={{ bgcolor: `${color}15`, borderRadius: 2, p: 0.8, display:"flex" }}>
          <Icon sx={{ color, fontSize: 20 }} />
        </Box>
        <Typography variant="caption" color="text.secondary" fontWeight={600}
          sx={{ textTransform:"uppercase", letterSpacing: 0.5 }}>
          {label}
        </Typography>
      </Box>
      <Typography variant="h5" fontWeight={800} sx={{ color: danger ? "#c62828" : "text.primary" }}>
        {value}
      </Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Paper>
  );
}

// ─── Gauge ───────────────────────────────────────────────────────
function GoalGauge({ value, goal, monthLabel }) {
  const pct = goal > 0 ? Math.min(Math.round((value / goal) * 100), 100) : 0;
  const color = pct >= 100 ? "#43a047" : pct >= 70 ? "#fb8c00" : "#e53935";
  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #e0e0e0",
      height:"100%", display:"flex", flexDirection:"column", alignItems:"center" }}>
      <Typography variant="caption" color="text.secondary" fontWeight={600}
        sx={{ textTransform:"uppercase", letterSpacing: 0.5, mb: 0.5 }}>
        Meta — {monthLabel}
      </Typography>
      {goal > 0 ? (
        <>
          <RadialBarChart width={180} height={110} cx={90} cy={100}
            innerRadius={65} outerRadius={88} startAngle={180} endAngle={0}
            data={[{ value: pct, fill: color }]} barSize={18}>
            <RadialBar background dataKey="value" cornerRadius={6} />
          </RadialBarChart>
          <Box sx={{ mt: -3, textAlign:"center" }}>
            <Typography variant="h4" fontWeight={800} sx={{ color }}>{pct}%</Typography>
            <Typography variant="caption" color="text.secondary">
              {fmt(value)} de {fmt(goal)}
            </Typography>
          </Box>
        </>
      ) : (
        <Box sx={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
          justifyContent:"center", gap: 1 }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Sin meta configurada
          </Typography>
          <Typography variant="caption" color="primary" align="center">
            Usa "Configurar Metas" arriba
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

// ─── Section header ──────────────────────────────────────────────
function SectionTitle({ children, sub }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography variant="h6" fontWeight={700}>{children}</Typography>
      {sub && <Typography variant="body2" color="text.secondary">{sub}</Typography>}
    </Box>
  );
}

function EmptyState({ msg = "Sin datos en el período seleccionado" }) {
  return (
    <Box sx={{ py: 6, textAlign:"center" }}>
      <Typography color="text.secondary">{msg}</Typography>
    </Box>
  );
}

// ─── Tab 0: VENTAS ───────────────────────────────────────────────
function SalesTab({ data, daily, byBranch, loading }) {
  if (loading) return <Box sx={{ py: 4, textAlign:"center" }}><CircularProgress /></Box>;
  if (!data) return <EmptyState />;

  const payData = Object.entries(data.payment_breakdown || {}).map(([k,v]) => ({ name: k, value: v }));
  const statusData = Object.entries(data.orders_by_status || {}).map(([k,v]) => ({ name: k, value: v }));

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs:12, sm:6, md:3 }}>
          <KpiCard icon={AttachMoneyIcon} label="Ingresos totales" value={fmt(data.total_revenue)} color="#43a047" />
        </Grid>
        <Grid size={{ xs:12, sm:6, md:3 }}>
          <KpiCard icon={ReceiptLongIcon} label="Ticket promedio" value={fmt(data.ticket_avg)}
            sub={`${fmtN(data.orders_count)} órdenes`} color="#1976d2" />
        </Grid>
        <Grid size={{ xs:12, sm:6, md:3 }}>
          <KpiCard icon={AttachMoneyIcon} label="Cobradas" color="#43a047"
            value={fmt((data.payment_breakdown?.Efectivo||0) + (data.payment_breakdown?.Tarjeta||0) + (data.payment_breakdown?.Transferencia||0))} />
        </Grid>
        <Grid size={{ xs:12, sm:6, md:3 }}>
          <KpiCard icon={AttachMoneyIcon} label="Por cobrar" color="#fb8c00"
            value={fmt(data.payment_breakdown?.Pendiente || 0)} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs:12, md:8 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border:"1px solid #e0e0e0" }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Tendencia de Ingresos por Día</Typography>
            {daily.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={daily} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1976d2" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#1976d2" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => fmt(v)} labelFormatter={l => `Día: ${l}`} />
                  <Area type="monotone" dataKey="revenue" name="Ingresos" stroke="#1976d2"
                    strokeWidth={2} fill="url(#gRev)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs:12, md:4 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border:"1px solid #e0e0e0", height:"100%" }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Métodos de Pago</Typography>
            {payData.length === 0 ? <EmptyState /> : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={payData} cx="50%" cy="50%" innerRadius={45} outerRadius={65}
                      dataKey="value" nameKey="name" label={({ percent }) => `${(percent*100).toFixed(0)}%`}
                      labelLine={false}>
                      {payData.map((_, i) => <Cell key={i} fill={COLORS6[i % COLORS6.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ display:"flex", flexWrap:"wrap", gap: 0.7, justifyContent:"center", mt: 1 }}>
                  {payData.map((d, i) => (
                    <Chip key={i} size="small" label={`${d.name}: ${fmt(d.value)}`}
                      sx={{ fontSize: 11, bgcolor: `${COLORS6[i%COLORS6.length]}18` }} />
                  ))}
                </Box>
              </>
            )}
          </Paper>
        </Grid>

        {byBranch.length > 1 && (
          <Grid size={{ xs:12 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border:"1px solid #e0e0e0" }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Ventas por Sucursal</Typography>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byBranch} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <YAxis dataKey="branch_name" type="category" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => fmt(v)} />
                  <Bar dataKey="revenue" name="Ingresos" radius={[0,4,4,0]}>
                    {byBranch.map((_,i) => <Cell key={i} fill={COLORS6[i%COLORS6.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

// ─── Tab 1: FLUJO OPERATIVO ──────────────────────────────────────
function FlowTab({ summary, loading }) {
  if (loading) return <Box sx={{ py: 4, textAlign:"center" }}><CircularProgress /></Box>;
  if (!summary) return <EmptyState />;

  const statusMap = summary.orders_by_status || {};
  const funnelData = FUNNEL_STAGES.map(s => ({
    name: s.label, value: statusMap[s.key] || 0, fill: s.color,
  })).filter(d => d.value > 0);

  const pending = (statusMap["Pendiente"]||0) + (statusMap["En Proceso"]||0) + (statusMap["En Producción"]||0);
  const ready   = statusMap["Listo"] || 0;
  const delivered = statusMap["Entregado"] || 0;

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {FUNNEL_STAGES.map(s => (
          <Grid key={s.key} size={{ xs:6, sm:4, md:2.4 }}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border:`2px solid ${s.color}20`,
              textAlign:"center" }}>
              <Typography variant="h4" fontWeight={800} sx={{ color: s.color }}>
                {statusMap[s.key] || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs:12, md:7 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border:"1px solid #e0e0e0" }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>Ciclo de Vida de la Prenda</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display:"block", mb: 2 }}>
              Donde el embudo se estrecha está el cuello de botella
            </Typography>
            {funnelData.length === 0 ? <EmptyState msg="Sin órdenes activas en el período" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <FunnelChart>
                  <Tooltip formatter={v => [`${v} órdenes`, ""]} />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive>
                    <LabelList position="right" fill="#444" stroke="none" dataKey="name"
                      style={{ fontSize: 12, fontWeight: 600 }} />
                    <LabelList position="center" fill="#fff" stroke="none" dataKey="value"
                      style={{ fontSize: 14, fontWeight: 800 }} />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs:12, md:5 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border:"1px solid #e0e0e0", height:"100%" }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Estado del Inventario</Typography>
            <Box sx={{ display:"flex", flexDirection:"column", gap: 2, mt: 1 }}>
              {[
                { label:"En proceso (rojo = urgente)", val: pending, total: pending+ready+delivered, color:"#e53935" },
                { label:"Listas para entregar", val: ready, total: pending+ready+delivered, color:"#43a047" },
                { label:"Entregadas en el período", val: delivered, total: pending+ready+delivered, color:"#1976d2" },
              ].map(({ label, val, total, color }) => (
                <Box key={label}>
                  <Box sx={{ display:"flex", justifyContent:"space-between", mb: 0.5 }}>
                    <Typography variant="body2">{label}</Typography>
                    <Typography variant="body2" fontWeight={700}>{val}</Typography>
                  </Box>
                  <LinearProgress variant="determinate"
                    value={total > 0 ? Math.round((val / total) * 100) : 0}
                    sx={{ height: 8, borderRadius: 4,
                      bgcolor: `${color}20`, "& .MuiLinearProgress-bar": { bgcolor: color } }} />
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

// ─── Tab 2: POR COBRAR ───────────────────────────────────────────
function ReceivableTab({ data, loading }) {
  if (loading) return <Box sx={{ py: 4, textAlign:"center" }}><CircularProgress /></Box>;
  if (!data) return <EmptyState />;

  const agingData = Object.entries(data.aging || {}).map(([k,v]) => ({ name: k, value: v }));

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs:12, sm:4 }}>
          <KpiCard icon={AttachMoneyIcon} label="Total por cobrar" value={fmt(data.total)}
            color={data.total > 0 ? "#e53935" : "#43a047"} danger={data.total > 0} />
        </Grid>
        <Grid size={{ xs:12, sm:4 }}>
          <KpiCard icon={ReceiptLongIcon} label="Órdenes pendientes"
            value={fmtN(data.count)} color="#fb8c00" />
        </Grid>
        <Grid size={{ xs:12, sm:4 }}>
          <KpiCard icon={AccessTimeIcon} label="+30 días sin pagar"
            value={fmt(data.aging?.["+30 días"] || 0)}
            color="#c62828" danger={(data.aging?.["+30 días"] || 0) > 0} />
        </Grid>
      </Grid>

      {agingData.some(d => d.value > 0) && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border:"1px solid #e0e0e0", mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Antigüedad de Saldos</Typography>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={agingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => fmt(v)} />
              <Bar dataKey="value" name="Saldo" radius={[4,4,0,0]}>
                {agingData.map((_, i) => <Cell key={i} fill={["#43a047","#fb8c00","#ef6c00","#c62828"][i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}

      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border:"1px solid #e0e0e0" }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Detalle de Cuentas por Cobrar</Typography>
        {data.orders?.length === 0 ? (
          <Alert severity="success">No hay cuentas pendientes de cobro</Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: 700, bgcolor: "#fafafa" } }}>
                  <TableCell>Folio</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Sucursal</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Pagado</TableCell>
                  <TableCell align="right">Saldo</TableCell>
                  <TableCell align="center">Días</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data.orders || []).map((o, i) => (
                  <TableRow key={i} hover
                    sx={{ bgcolor: o.days_old > 30 ? "#fff8f8" : o.days_old > 7 ? "#fffde7" : "inherit" }}>
                    <TableCell><Typography variant="caption" fontWeight={700}>{o.folio}</Typography></TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{o.client_name}</Typography>
                      <Typography variant="caption" color="text.secondary">{o.client_phone}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="caption">{o.branch_name}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{o.order_date}</Typography></TableCell>
                    <TableCell>
                      <Chip size="small" label={o.status}
                        sx={{ fontSize: 10, bgcolor: `${STATUS_COLOR[o.status] || "#90a4ae"}20`,
                              color: STATUS_COLOR[o.status] || "#555" }} />
                    </TableCell>
                    <TableCell align="right"><Typography variant="body2">{fmt(o.total_amount)}</Typography></TableCell>
                    <TableCell align="right"><Typography variant="body2" color="success.main">{fmt(o.amount_paid)}</Typography></TableCell>
                    <TableCell align="right"><Typography variant="body2" fontWeight={700} color="error.main">{fmt(o.balance)}</Typography></TableCell>
                    <TableCell align="center">
                      <Chip size="small" label={`${o.days_old}d`}
                        color={o.days_old > 30 ? "error" : o.days_old > 7 ? "warning" : "default"} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}

// ─── Tab 3: CLIENTES ─────────────────────────────────────────────
function ClientsTab({ retention, detail, loading }) {
  if (loading) return <Box sx={{ py: 4, textAlign:"center" }}><CircularProgress /></Box>;

  const retData = retention ? [
    { name:"Recurrentes", value: retention.recurring, fill:"#1976d2" },
    { name:"Nuevos",      value: retention.new,       fill:"#43a047" },
  ] : [];
  const recurringPct = retention?.total > 0
    ? Math.round((retention.recurring / retention.total) * 100) : 0;

  return (
    <Box>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs:12, md:5 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border:"1px solid #e0e0e0", height:"100%" }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>Retención de Clientes</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display:"block", mb: 1 }}>
              Tintorería sana = 70%+ recurrentes
            </Typography>
            {!retention || retention.total === 0 ? <EmptyState /> : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={retData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                      dataKey="value" label={({ name, percent }) => `${(percent*100).toFixed(0)}%`}
                      labelLine={false}>
                      {retData.map((e,i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ display:"flex", gap: 1.5, justifyContent:"center", flexWrap:"wrap" }}>
                  <Chip size="small" label={`Recurrentes: ${retention.recurring}`}
                    sx={{ bgcolor:"#e3f2fd", color:"#1976d2" }} />
                  <Chip size="small" label={`Nuevos: ${retention.new}`}
                    sx={{ bgcolor:"#e8f5e9", color:"#43a047" }} />
                </Box>
                <Alert severity={recurringPct >= 70 ? "success" : recurringPct >= 50 ? "warning" : "error"}
                  sx={{ mt: 2, py: 0.5, fontSize: 12 }}>
                  {recurringPct}% de retención
                  {recurringPct >= 70 ? " — excelente" : recurringPct >= 50 ? " — puede mejorar" : " — revisar servicio"}
                </Alert>
              </>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs:12, md:7 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border:"1px solid #e0e0e0", height:"100%" }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Top 10 Clientes por Gasto</Typography>
            {!detail?.top_clients?.length ? <EmptyState /> : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ "& th": { fontWeight:700, bgcolor:"#fafafa" } }}>
                      <TableCell>#</TableCell>
                      <TableCell>Cliente</TableCell>
                      <TableCell align="right">Órdenes</TableCell>
                      <TableCell align="right">Total gastado</TableCell>
                      <TableCell align="right">Puntos</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detail.top_clients.map((c,i) => (
                      <TableRow key={i} hover>
                        <TableCell>
                          <Box sx={{ width:24, height:24, borderRadius:"50%", bgcolor: COLORS6[i%6],
                            display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <Typography variant="caption" sx={{ color:"#fff", fontWeight:700 }}>{i+1}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{c.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{c.phone}</Typography>
                        </TableCell>
                        <TableCell align="right"><Chip size="small" label={c.order_count} /></TableCell>
                        <TableCell align="right"><Typography variant="body2" fontWeight={700}>{fmt(c.total_spend)}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="caption">{fmtN(c.points)}</Typography></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      {detail?.upcoming_birthdays?.length > 0 && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border:"1px solid #fce4ec" }}>
          <Box sx={{ display:"flex", alignItems:"center", gap: 1, mb: 2 }}>
            <CakeIcon sx={{ color:"#e91e63" }} />
            <Typography variant="subtitle1" fontWeight={700}>Cumpleaños próximos (30 días)</Typography>
          </Box>
          <Box sx={{ display:"flex", flexWrap:"wrap", gap: 1.5 }}>
            {detail.upcoming_birthdays.map((b,i) => (
              <Paper key={i} elevation={0} sx={{ p: 1.5, borderRadius: 2, border:"1px solid #fce4ec",
                display:"flex", alignItems:"center", gap: 1.5 }}>
                <Box sx={{ textAlign:"center", minWidth: 40 }}>
                  <Typography variant="h6" fontWeight={800} sx={{ color:"#e91e63", lineHeight:1 }}>{b.date}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {b.days_until === 0 ? "¡Hoy!" : `en ${b.days_until}d`}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight={600}>{b.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{b.phone}</Typography>
                </Box>
              </Paper>
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  );
}

// ─── Tab 4: SERVICIOS ────────────────────────────────────────────
function ServicesTab({ items, loading }) {
  if (loading) return <Box sx={{ py: 4, textAlign:"center" }}><CircularProgress /></Box>;
  if (!items?.length) return <EmptyState />;

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border:"1px solid #e0e0e0" }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
        Top 10 Servicios más solicitados
      </Typography>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={items} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis dataKey="item_name" type="category" width={150} tick={{ fontSize: 11 }} />
          <Tooltip formatter={v => [`${v} piezas`, "Cantidad"]} />
          <Bar dataKey="qty" name="Piezas" radius={[0,4,4,0]}>
            {items.map((_,i) => <Cell key={i} fill={COLORS6[i%COLORS6.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
}

// ─── Tab 5: DESCUENTOS Y PROMOS ──────────────────────────────────
function DiscountsTab({ data, loading }) {
  if (loading) return <Box sx={{ py: 4, textAlign:"center" }}><CircularProgress /></Box>;
  if (!data) return <EmptyState />;

  const impact = [
    { name:"Ingreso real", value: data.total_revenue },
    { name:"Descuento dado", value: data.total_discount },
  ];

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs:12, sm:6, md:3 }}>
          <KpiCard icon={LocalOfferIcon} label="Total descontado" value={fmt(data.total_discount)}
            color={data.total_discount > 0 ? "#e53935" : "#43a047"} />
        </Grid>
        <Grid size={{ xs:12, sm:6, md:3 }}>
          <KpiCard icon={ReceiptLongIcon} label="Órdenes con descuento"
            value={`${data.orders_with_discount} / ${data.orders_count}`}
            sub={`${data.discount_pct?.toFixed(1)}% del subtotal`} color="#fb8c00" />
        </Grid>
        <Grid size={{ xs:12, sm:6, md:3 }}>
          <KpiCard icon={AttachMoneyIcon} label="Puntos canjeados"
            value={fmtN(data.total_points_redeemed)} color="#8e24aa" />
        </Grid>
        <Grid size={{ xs:12, sm:6, md:3 }}>
          <KpiCard icon={TrendingUpIcon} label="Ingreso neto"
            value={fmt(data.total_revenue)} color="#43a047" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs:12, md:5 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border:"1px solid #e0e0e0" }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Impacto en Ingresos</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={impact}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => fmt(v)} />
                <Bar dataKey="value" radius={[4,4,0,0]}>
                  <Cell fill="#43a047" />
                  <Cell fill="#e53935" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid size={{ xs:12, md:7 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border:"1px solid #e0e0e0" }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Promociones Activas</Typography>
            {!data.active_promos?.length ? (
              <Alert severity="info">No hay promociones activas configuradas</Alert>
            ) : (
              <Box sx={{ display:"flex", flexDirection:"column", gap: 1 }}>
                {data.active_promos.map((p,i) => (
                  <Box key={i} sx={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    p: 1.5, borderRadius: 2, bgcolor:"#f8f9fa", border:"1px solid #e0e0e0" }}>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>{p.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{p.type}</Typography>
                    </Box>
                    {p.discount_pct > 0 && (
                      <Chip size="small" label={`${p.discount_pct}% off`}
                        sx={{ bgcolor:"#e8f5e9", color:"#43a047", fontWeight:700 }} />
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

// ─── Tab 6: SUCURSALES ───────────────────────────────────────────
function BranchesTab({ data, loading }) {
  if (loading) return <Box sx={{ py: 4, textAlign:"center" }}><CircularProgress /></Box>;
  if (!data?.length) return <EmptyState msg="Sin datos por sucursal o solo tienes una sucursal" />;

  const maxRev = Math.max(...data.map(d => d.revenue), 1);

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border:"1px solid #e0e0e0", mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Comparativo de Sucursales</Typography>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
            <XAxis dataKey="branch_name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={v => fmt(v)} />
            <Legend />
            <Bar dataKey="revenue" name="Ingresos" radius={[4,4,0,0]}>
              {data.map((_,i) => <Cell key={i} fill={COLORS6[i%COLORS6.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border:"1px solid #e0e0e0" }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Detalle por Sucursal</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight:700, bgcolor:"#fafafa" } }}>
                <TableCell>Sucursal</TableCell>
                <TableCell align="right">Ingresos</TableCell>
                <TableCell align="right">Órdenes</TableCell>
                <TableCell align="right">Ticket prom.</TableCell>
                <TableCell>Participación</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((b, i) => (
                <TableRow key={i} hover>
                  <TableCell>
                    <Box sx={{ display:"flex", alignItems:"center", gap: 1 }}>
                      <Box sx={{ width:10, height:10, borderRadius:"50%", bgcolor: COLORS6[i%6] }} />
                      <Typography variant="body2" fontWeight={600}>{b.branch_name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right"><Typography variant="body2" fontWeight={700}>{fmt(b.revenue)}</Typography></TableCell>
                  <TableCell align="right">{fmtN(b.orders)}</TableCell>
                  <TableCell align="right">{b.orders > 0 ? fmt(b.revenue / b.orders) : "—"}</TableCell>
                  <TableCell sx={{ minWidth: 140 }}>
                    <Box sx={{ display:"flex", alignItems:"center", gap: 1 }}>
                      <LinearProgress variant="determinate"
                        value={Math.round((b.revenue / maxRev) * 100)}
                        sx={{ flex:1, height: 6, borderRadius:3,
                          bgcolor: `${COLORS6[i%6]}20`,
                          "& .MuiLinearProgress-bar": { bgcolor: COLORS6[i%6] } }} />
                      <Typography variant="caption">
                        {Math.round((b.revenue / maxRev) * 100)}%
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

// ─── GOAL DIALOG ─────────────────────────────────────────────────
function GoalDialog({ open, onClose, onSaved, branches, token }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [globalAmt, setGlobalAmt] = useState("");
  const [branchAmts, setBranchAmts] = useState({});
  const [saving, setSaving] = useState(false);
  const headers = { Authorization: `Bearer ${token}`, "Content-Type":"application/json" };

  const save = async () => {
    setSaving(true);
    try {
      if (globalAmt !== "")
        await fetch(`${API}/api/v1/goals`, { method:"POST", headers,
          body: JSON.stringify({ year, month, branch_id: null, goal_amount: Number(globalAmt) }) });
      for (const [bid, amt] of Object.entries(branchAmts))
        if (amt !== "")
          await fetch(`${API}/api/v1/goals`, { method:"POST", headers,
            body: JSON.stringify({ year, month, branch_id: Number(bid), goal_amount: Number(amt) }) });
      onSaved();
    } catch {}
    setSaving(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Configurar Metas de Venta</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs:6 }}>
            <TextField select fullWidth label="Año" size="small" value={year} onChange={e => setYear(Number(e.target.value))}>
              {[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(y =>
                <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs:6 }}>
            <TextField select fullWidth label="Mes" size="small" value={month} onChange={e => setMonth(Number(e.target.value))}>
              {MONTHS.map((m,i) => <MenuItem key={i+1} value={i+1}>{m}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs:12 }}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Meta Global (todo el negocio)</Typography>
            <TextField fullWidth label="Meta global ($)" type="number" size="small"
              value={globalAmt} onChange={e => setGlobalAmt(e.target.value)} />
          </Grid>
          {branches.length > 0 && (
            <Grid size={{ xs:12 }}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Meta por Sucursal</Typography>
              <Grid container spacing={1.5}>
                {branches.map(b => (
                  <Grid key={b.id} size={{ xs:12, sm:6 }}>
                    <TextField fullWidth label={b.name} type="number" size="small"
                      value={branchAmts[b.id] || ""}
                      onChange={e => setBranchAmts(p => ({ ...p, [b.id]: e.target.value }))} />
                  </Grid>
                ))}
              </Grid>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────
const TABS = [
  { label:"Ventas",         icon:"📊" },
  { label:"Flujo Operativo",icon:"🔄" },
  { label:"Por Cobrar",     icon:"💰" },
  { label:"Clientes",       icon:"👥" },
  { label:"Servicios",      icon:"🧺" },
  { label:"Descuentos",     icon:"🏷️" },
  { label:"Sucursales",     icon:"🏢" },
];

export default function Reports() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");
  const role  = localStorage.getItem("role");
  const branchIdStored = localStorage.getItem("branch_id");
  const now   = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`;
  const defaultTo   = now.toISOString().split("T")[0];

  const [branches, setBranches]         = useState([]);
  const [selBranch, setSelBranch]       = useState(role === "branch_manager" ? branchIdStored||"" : "");
  const [dateFrom, setDateFrom]         = useState(defaultFrom);
  const [dateTo, setDateTo]             = useState(defaultTo);
  const [applied, setApplied]           = useState({ branch: role === "branch_manager" ? branchIdStored||"" : "", from: defaultFrom, to: defaultTo });
  const [activeTab, setActiveTab]       = useState(0);
  const [goalDialog, setGoalDialog]     = useState(false);

  const [overview, setOverview]         = useState(null);
  const [goalData, setGoalData]         = useState(null);
  const [ovLoading, setOvLoading]       = useState(true);

  const [summary, setSummary]           = useState(null);
  const [daily, setDaily]               = useState([]);
  const [byBranch, setByBranch]         = useState([]);
  const [topItems, setTopItems]         = useState([]);
  const [retention, setRetention]       = useState(null);
  const [clientsDetail, setClientsDetail] = useState(null);
  const [receivable, setReceivable]     = useState(null);
  const [discounts, setDiscounts]       = useState(null);
  const [tabLoading, setTabLoading]     = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const buildQ = useCallback((extra = {}) => {
    const p = new URLSearchParams({ date_from: applied.from, date_to: applied.to, ...extra });
    if (applied.branch) p.set("branch_id", applied.branch);
    return p.toString();
  }, [applied]);

  // Load branches
  useEffect(() => {
    (async () => {
      try {
        const claims = JSON.parse(atob(token.split(".")[1]));
        const r = await fetch(`${API}/businesses/${claims.business_id}/branches`, { headers });
        if (r.ok) { const d = await r.json(); setBranches(Array.isArray(d) ? d : d.branches || []); }
      } catch {}
    })();
  }, []);

  // Load overview (always current month, re-runs on branch change)
  const loadOverview = useCallback(async () => {
    setOvLoading(true);
    try {
      const bq = applied.branch ? `branch_id=${applied.branch}` : "";
      const [r1, r2] = await Promise.all([
        fetch(`${API}/api/v1/reports/overview?${bq}`, { headers }),
        fetch(`${API}/api/v1/goals?year=${now.getFullYear()}&month=${now.getMonth()+1}${bq ? "&"+bq : ""}`, { headers }),
      ]);
      if (r1.ok) setOverview(await r1.json());
      if (r2.ok) {
        const g = await r2.json();
        setGoalData(applied.branch ? g.branch : g.global);
      }
    } catch {}
    setOvLoading(false);
  }, [applied.branch]);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  // Load tab data when tab or filters change
  useEffect(() => {
    (async () => {
      setTabLoading(true);
      try {
        if (activeTab === 0) {
          const [r1, r2, r3] = await Promise.all([
            fetch(`${API}/api/v1/reports/summary?${buildQ()}`, { headers }),
            fetch(`${API}/api/v1/reports/daily-trend?${buildQ()}`, { headers }),
            fetch(`${API}/api/v1/reports/by-branch?${buildQ()}`, { headers }),
          ]);
          if (r1.ok) setSummary(await r1.json());
          if (r2.ok) setDaily((await r2.json()).data || []);
          if (r3.ok) setByBranch((await r3.json()).data || []);
        } else if (activeTab === 1) {
          const r = await fetch(`${API}/api/v1/reports/summary?${buildQ()}`, { headers });
          if (r.ok) setSummary(await r.json());
        } else if (activeTab === 2) {
          const r = await fetch(`${API}/api/v1/reports/receivable?${applied.branch ? `branch_id=${applied.branch}` : ""}`, { headers });
          if (r.ok) setReceivable(await r.json());
        } else if (activeTab === 3) {
          const [r1, r2] = await Promise.all([
            fetch(`${API}/api/v1/reports/client-retention?${buildQ()}`, { headers }),
            fetch(`${API}/api/v1/reports/clients-detail?${buildQ()}`, { headers }),
          ]);
          if (r1.ok) setRetention(await r1.json());
          if (r2.ok) setClientsDetail(await r2.json());
        } else if (activeTab === 4) {
          const r = await fetch(`${API}/api/v1/reports/top-items?${buildQ()}`, { headers });
          if (r.ok) setTopItems((await r.json()).data || []);
        } else if (activeTab === 5) {
          const r = await fetch(`${API}/api/v1/reports/discounts?${buildQ()}`, { headers });
          if (r.ok) setDiscounts(await r.json());
        } else if (activeTab === 6) {
          const r = await fetch(`${API}/api/v1/reports/by-branch?${buildQ()}`, { headers });
          if (r.ok) setByBranch((await r.json()).data || []);
        }
      } catch {}
      setTabLoading(false);
    })();
  }, [activeTab, applied]);

  const applyFilters = () => setApplied({ branch: selBranch, from: dateFrom, to: dateTo });

  return (
    <Box sx={{ p: { xs:2, md:3 }, maxWidth:1300, mx:"auto" }}>

      {/* ── Header ── */}
      <Box sx={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        mb: 3, flexWrap:"wrap", gap: 1.5 }}>
        <Box sx={{ display:"flex", alignItems:"center", gap: 1 }}>
          <IconButton onClick={() => navigate(-1)} size="small"><ArrowBackIcon /></IconButton>
          <Box>
            <Typography variant="h5" fontWeight={800}>Reportes</Typography>
            <Typography variant="caption" color="text.secondary">
              {now.toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
            </Typography>
          </Box>
        </Box>
        <Button startIcon={<SettingsIcon />} variant="outlined" size="small"
          onClick={() => setGoalDialog(true)}>
          Configurar Metas
        </Button>
      </Box>

      {/* ── Overview KPIs ── */}
      <Box sx={{ mb: 3 }}>
        {ovLoading ? (
          <Box sx={{ py:3, textAlign:"center" }}><CircularProgress size={32} /></Box>
        ) : (
          <Grid container spacing={2}>
            <Grid size={{ xs:6, sm:4, md:2 }}>
              <KpiCard icon={TodayIcon} label="Hoy" value={fmt(overview?.today_revenue)} color="#1976d2" />
            </Grid>
            <Grid size={{ xs:6, sm:4, md:2 }}>
              <KpiCard icon={CalendarMonthIcon} label={MONTHS[now.getMonth()]}
                value={fmt(overview?.month_revenue)}
                sub={`${fmtN(overview?.month_count)} órdenes`} color="#43a047" />
            </Grid>
            <Grid size={{ xs:6, sm:4, md:2 }}>
              <KpiCard icon={ReceiptLongIcon} label="Ticket promedio"
                value={fmt(overview?.ticket_avg)} color="#fb8c00" />
            </Grid>
            <Grid size={{ xs:6, sm:4, md:2 }}>
              <KpiCard icon={PeopleAltIcon} label="Órdenes activas"
                value={fmtN(overview?.active_count)} color="#8e24aa" />
            </Grid>
            <Grid size={{ xs:6, sm:4, md:2 }}>
              <KpiCard icon={WarningAmberIcon} label="Atrasadas"
                value={fmtN(overview?.overdue_count)} color="#e53935"
                danger={overview?.overdue_count > 0} />
            </Grid>
            <Grid size={{ xs:6, sm:4, md:2 }}>
              <KpiCard icon={AttachMoneyIcon} label="Por cobrar"
                value={fmt(overview?.receivable)} color="#e53935"
                danger={overview?.receivable > 0} />
            </Grid>
            <Grid size={{ xs:12, sm:8, md:4 }}>
              <GoalGauge value={overview?.month_revenue || 0}
                goal={goalData ? Number(goalData.goal_amount) : 0}
                monthLabel={MONTHS[now.getMonth()]} />
            </Grid>
            <Grid size={{ xs:12, sm:4, md:4 }}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border:"1px solid #e0e0e0",
                height:"100%", display:"flex", flexDirection:"column", justifyContent:"center" }}>
                <Box sx={{ display:"flex", alignItems:"center", gap: 1, mb: 1 }}>
                  <Box sx={{ bgcolor:"#fff3e020", borderRadius:2, p:0.8, display:"flex" }}>
                    <TrendingUpIcon sx={{ color:"#fb8c00", fontSize:20 }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}
                    sx={{ textTransform:"uppercase", letterSpacing:0.5 }}>
                    Servicio más popular
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight={800}>
                  {overview?.top_service || "Sin datos"}
                </Typography>
                <Typography variant="caption" color="text.secondary">Este mes</Typography>
              </Paper>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* ── Filters ── */}
      <Paper elevation={0} sx={{ p: 2, mb: 2.5, borderRadius: 3, border:"1px solid #e0e0e0" }}>
        <Grid container spacing={2} alignItems="center">
          {role !== "branch_manager" && (
            <Grid size={{ xs:12, sm:4, md:3 }}>
              <TextField select fullWidth label="Sucursal" size="small" value={selBranch}
                onChange={e => setSelBranch(e.target.value)}>
                <MenuItem value="">Todas las sucursales</MenuItem>
                {branches.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </TextField>
            </Grid>
          )}
          <Grid size={{ xs:6, sm:3, md:2 }}>
            <TextField fullWidth label="Desde" type="date" size="small" InputLabelProps={{ shrink:true }}
              value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </Grid>
          <Grid size={{ xs:6, sm:3, md:2 }}>
            <TextField fullWidth label="Hasta" type="date" size="small" InputLabelProps={{ shrink:true }}
              value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </Grid>
          <Grid size={{ xs:12, sm:2, md:2 }}>
            <Button fullWidth variant="contained" startIcon={<SearchIcon />} onClick={applyFilters}>
              Aplicar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* ── Tabs ── */}
      <Paper elevation={0} sx={{ borderRadius: 3, border:"1px solid #e0e0e0", overflow:"hidden" }}>
        <Box sx={{ borderBottom:"1px solid #e0e0e0" }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable"
            scrollButtons="auto" sx={{ "& .MuiTab-root": { minHeight: 52, textTransform:"none",
              fontWeight:600, fontSize: 13 } }}>
            {TABS.map((t, i) => (
              <Tab key={i} label={`${t.icon} ${t.label}`} />
            ))}
          </Tabs>
        </Box>
        <Box sx={{ p: 3 }}>
          {activeTab === 0 && <SalesTab data={summary} daily={daily} byBranch={byBranch} loading={tabLoading} />}
          {activeTab === 1 && <FlowTab summary={summary} loading={tabLoading} />}
          {activeTab === 2 && <ReceivableTab data={receivable} loading={tabLoading} />}
          {activeTab === 3 && <ClientsTab retention={retention} detail={clientsDetail} loading={tabLoading} />}
          {activeTab === 4 && <ServicesTab items={topItems} loading={tabLoading} />}
          {activeTab === 5 && <DiscountsTab data={discounts} loading={tabLoading} />}
          {activeTab === 6 && <BranchesTab data={byBranch} loading={tabLoading} />}
        </Box>
      </Paper>

      <GoalDialog open={goalDialog} onClose={() => setGoalDialog(false)}
        onSaved={() => { setGoalDialog(false); loadOverview(); }}
        branches={branches} token={token} />
    </Box>
  );
}
