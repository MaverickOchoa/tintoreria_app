import React, { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Chip, CircularProgress, Alert,
  Tabs, Tab, LinearProgress, Tooltip,
} from "@mui/material";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";

const API = import.meta.env.VITE_API_URL;

const marginColor = (pct) => {
  if (pct >= 50) return "success";
  if (pct >= 30) return "warning";
  return "error";
};
const marginLabel = (pct) => {
  if (pct >= 50) return "Rentable";
  if (pct >= 30) return "Aceptable";
  return "Problema";
};

export default function ProfitabilityReport() {
  const [services, setServices] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [tab, setTab]           = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API}/api/v1/reports/profitability`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        setServices(d.services || []);
        setBranches(d.branches || []);
        setLoading(false);
      })
      .catch(() => { setError("Error al cargar reporte"); setLoading(false); });
  }, []);

  const maxRevenue = Math.max(...services.map(s => s.total_revenue), 1);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <AttachMoneyIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>Rentabilidad por Prenda</Typography>
      </Box>

      {!loading && services.length > 0 && branches.some(b => !b.cost_per_point) && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Algunas sucursales no tienen configurado el "Costo por punto". Ve a Ajustes de Sucursal para activar el análisis completo.
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Por Servicio" />
        <Tab label="Por Sucursal" />
      </Tabs>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
      ) : tab === 0 ? (
        <Paper sx={{ borderRadius: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell>Servicio</TableCell>
                  <TableCell align="center">Pts</TableCell>
                  <TableCell align="right">Precio</TableCell>
                  <TableCell align="right">Costo unit.</TableCell>
                  <TableCell align="right">Margen unit.</TableCell>
                  <TableCell align="center">Vendidas</TableCell>
                  <TableCell align="right">Ingreso total</TableCell>
                  <TableCell align="center">Margen %</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {services.map(s => (
                  <TableRow key={s.item_id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{s.name}</Typography>
                      <Tooltip title="Barra = proporción del ingreso total" placement="top">
                        <LinearProgress
                          variant="determinate"
                          value={(s.total_revenue / maxRevenue) * 100}
                          sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                          color={marginColor(s.margin_pct)}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">{s.cost_points}</TableCell>
                    <TableCell align="right">${s.price.toFixed(2)}</TableCell>
                    <TableCell align="right">
                      {s.unit_cost > 0 ? `$${s.unit_cost.toFixed(2)}` : <Typography variant="caption" color="text.secondary">—</Typography>}
                    </TableCell>
                    <TableCell align="right">
                      {s.unit_cost > 0
                        ? <Typography fontWeight={600} color={s.unit_margin >= 0 ? "success.main" : "error.main"}>${s.unit_margin.toFixed(2)}</Typography>
                        : <Typography variant="caption" color="text.secondary">—</Typography>}
                    </TableCell>
                    <TableCell align="center">{s.total_qty}</TableCell>
                    <TableCell align="right">${s.total_revenue.toFixed(2)}</TableCell>
                    <TableCell align="center">
                      {s.unit_cost > 0
                        ? <Typography fontWeight={700} color={`${marginColor(s.margin_pct)}.main`}>{s.margin_pct}%</Typography>
                        : <Typography variant="caption" color="text.secondary">Sin config</Typography>}
                    </TableCell>
                    <TableCell>
                      {s.unit_cost > 0
                        ? <Chip label={marginLabel(s.margin_pct)} color={marginColor(s.margin_pct)} size="small" />
                        : null}
                    </TableCell>
                  </TableRow>
                ))}
                {services.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4, color: "text.secondary" }}>
                      No hay datos de órdenes.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : (
        <Paper sx={{ borderRadius: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell>Sucursal</TableCell>
                  <TableCell align="right">Costo/punto</TableCell>
                  <TableCell align="right">Ingreso total</TableCell>
                  <TableCell align="right">Costo estimado</TableCell>
                  <TableCell align="right">Margen</TableCell>
                  <TableCell align="center">Margen %</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {branches.map(b => (
                  <TableRow key={b.branch_id} hover>
                    <TableCell><Typography fontWeight={600}>{b.branch_name}</Typography></TableCell>
                    <TableCell align="right">
                      {b.cost_per_point ? `$${b.cost_per_point}` : <Chip label="Sin configurar" size="small" />}
                    </TableCell>
                    <TableCell align="right">${b.total_revenue.toFixed(2)}</TableCell>
                    <TableCell align="right">
                      {b.cost_per_point ? `$${b.total_cost.toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell align="right">
                      {b.cost_per_point
                        ? <Typography fontWeight={700} color={b.total_margin >= 0 ? "success.main" : "error.main"}>${b.total_margin.toFixed(2)}</Typography>
                        : "—"}
                    </TableCell>
                    <TableCell align="center">
                      {b.cost_per_point
                        ? <Typography fontWeight={700} color={`${marginColor(b.margin_pct)}.main`}>{b.margin_pct}%</Typography>
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {b.cost_per_point
                        ? <Chip label={marginLabel(b.margin_pct)} color={marginColor(b.margin_pct)} size="small" />
                        : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
}
