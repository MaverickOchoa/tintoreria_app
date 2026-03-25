import React, { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Chip, CircularProgress, Alert,
  TextField, InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";

const API = import.meta.env.VITE_API_URL;

const riskColor = (days) => {
  if (days === null || days === undefined) return "default";
  if (days > 90) return "error";
  if (days > 45) return "warning";
  return "success";
};
const riskLabel = (days) => {
  if (days === null || days === undefined) return "Sin visitas";
  if (days > 90) return "En riesgo";
  if (days > 45) return "Inactivo";
  return "Activo";
};

export default function ClientBehaviorReport() {
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    fetch(`${API}/api/v1/reports/client-behavior`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setData(d.clients || []); setLoading(false); })
      .catch(() => { setError("Error al cargar reporte"); setLoading(false); });
  }, []);

  const filtered = data.filter(c =>
    !search ||
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const atRisk    = data.filter(c => c.days_inactive !== null && c.days_inactive > 90).length;
  const inactive  = data.filter(c => c.days_inactive !== null && c.days_inactive > 45 && c.days_inactive <= 90).length;
  const avgTicket = data.length
    ? (data.reduce((s, c) => s + c.avg_ticket, 0) / data.filter(c => c.avg_ticket > 0).length || 0).toFixed(2)
    : 0;

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <TrendingDownIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>Comportamiento de Clientes</Typography>
      </Box>

      {/* Summary cards */}
      <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
        {[
          { label: "Total clientes", value: data.length, color: "primary.main" },
          { label: "En riesgo (+90 días)", value: atRisk, color: "error.main" },
          { label: "Inactivos (45-90 días)", value: inactive, color: "warning.main" },
          { label: "Ticket promedio", value: `$${avgTicket}`, color: "success.main" },
        ].map(card => (
          <Paper key={card.label} sx={{ p: 2, borderRadius: 2, minWidth: 150, flex: 1 }}>
            <Typography variant="body2" color="text.secondary">{card.label}</Typography>
            <Typography variant="h5" fontWeight={700} sx={{ color: card.color }}>{card.value}</Typography>
          </Paper>
        ))}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 2 }}>
          <TextField size="small" placeholder="Buscar por nombre o teléfono…"
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            sx={{ width: 280 }} />
        </Box>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell align="center">Órdenes</TableCell>
                  <TableCell align="right">Ticket Prom.</TableCell>
                  <TableCell align="center">Frec./mes</TableCell>
                  <TableCell>Última visita</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.client_id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{c.full_name || "—"}</Typography>
                      <Typography variant="caption" color="text.secondary">{c.phone}</Typography>
                    </TableCell>
                    <TableCell>
                      {c.client_type
                        ? <Chip label={c.client_type} size="small" />
                        : <Typography variant="caption" color="text.secondary">—</Typography>}
                    </TableCell>
                    <TableCell align="center">{c.total_orders}</TableCell>
                    <TableCell align="right">${c.avg_ticket.toFixed(2)}</TableCell>
                    <TableCell align="center">{c.freq_per_month}</TableCell>
                    <TableCell>
                      {c.last_visit
                        ? new Date(c.last_visit).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={riskLabel(c.days_inactive)}
                        color={riskColor(c.days_inactive)}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                      No hay clientes registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
