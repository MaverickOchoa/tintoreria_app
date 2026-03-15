import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, Grid, Card, CardContent,
  TextField, Button, Divider, Alert, CircularProgress,
  Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Chip, Tooltip, IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import HistoryIcon from "@mui/icons-material/History";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
const PAGE_SIZE = 10;

function fmt(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
}

function fmtMoney(val) {
  return `$${parseFloat(val || 0).toFixed(2)}`;
}

function DiffChip({ value }) {
  const v = parseFloat(value || 0);
  if (v > 0) return <Chip size="small" icon={<CheckCircleIcon />} label={`+${fmtMoney(v)}`} color="success" />;
  if (v < 0) return <Chip size="small" icon={<WarningIcon />} label={fmtMoney(v)} color="error" />;
  return <Chip size="small" label="$0.00" sx={{ bgcolor: "#f0f0f0", color: "#666" }} />;
}

export default function CashCut() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const branchId = localStorage.getItem("branch_id");

  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState("");

  const [countedCash, setCountedCash] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [submitError, setSubmitError] = useState("");

  const [history, setHistory] = useState([]);
  const [histTotal, setHistTotal] = useState(0);
  const [histPage, setHistPage] = useState(0);
  const [loadingHist, setLoadingHist] = useState(false);

  const loadPreview = useCallback(() => {
    setLoadingPreview(true);
    setPreviewError("");
    const params = branchId ? `?branch_id=${branchId}` : "";
    fetch(`${API}/api/v1/cash-cuts/preview${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { if (d.message) throw new Error(d.message); setPreview(d); })
      .catch(e => setPreviewError(e.message))
      .finally(() => setLoadingPreview(false));
  }, [token, branchId]);

  const loadHistory = useCallback(() => {
    setLoadingHist(true);
    const params = new URLSearchParams({ limit: PAGE_SIZE, offset: histPage * PAGE_SIZE });
    if (branchId) params.set("branch_id", branchId);
    fetch(`${API}/api/v1/cash-cuts?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setHistory(d.items || []); setHistTotal(d.total || 0); })
      .catch(console.error)
      .finally(() => setLoadingHist(false));
  }, [token, branchId, histPage]);

  useEffect(() => { loadPreview(); }, [loadPreview]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleSubmit = () => {
    if (!countedCash && countedCash !== "0") return;
    setSubmitting(true);
    setSubmitError("");
    setLastResult(null);
    fetch(`${API}/api/v1/cash-cuts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        branch_id: branchId ? parseInt(branchId) : undefined,
        counted_cash: parseFloat(countedCash),
        notes: notes || null,
      }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.message) throw new Error(d.message);
        setLastResult(d);
        setCountedCash("");
        setNotes("");
        loadPreview();
        setHistPage(0);
        loadHistory();
      })
      .catch(e => setSubmitError(e.message))
      .finally(() => setSubmitting(false));
  };

  const totalPages = Math.ceil(histTotal / PAGE_SIZE);

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <IconButton onClick={() => navigate("/panel-operativo")} size="small">
          <ArrowBackIcon />
        </IconButton>
        <PointOfSaleIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>Corte de Caja</Typography>
      </Box>

      <Grid container spacing={3}>
        {/* LEFT — resumen + formulario */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Resumen del período</Typography>

            {loadingPreview ? (
              <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
            ) : previewError ? (
              <Alert severity="error">{previewError}</Alert>
            ) : preview && (
              <>
                <Typography variant="caption" color="text.secondary">
                  Desde: {fmt(preview.period_from)} &nbsp;→&nbsp; Ahora
                </Typography>
                <Grid container spacing={2} mt={0.5} mb={2}>
                  {[
                    { label: "Órdenes", value: preview.orders_count, mono: true },
                    { label: "Efectivo esperado", value: fmtMoney(preview.expected_cash), color: "success.main" },
                    { label: "Tarjeta (ref.)", value: fmtMoney(preview.card_total) },
                    { label: "Puntos (ref.)", value: fmtMoney(preview.points_total) },
                  ].map(item => (
                    <Grid key={item.label} size={{ xs: 6 }}>
                      <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                          <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                          <Typography variant="h6" fontWeight={700} color={item.color || "text.primary"} sx={item.mono ? { fontFamily: "monospace" } : {}}>
                            {item.value}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Registrar corte</Typography>

                {lastResult && (
                  <Alert severity={parseFloat(lastResult.difference) < 0 ? "warning" : "success"} sx={{ mb: 2 }}>
                    Corte registrado — Diferencia: <strong>{parseFloat(lastResult.difference) >= 0 ? "+" : ""}{fmtMoney(lastResult.difference)}</strong>
                  </Alert>
                )}
                {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}

                <TextField
                  label="Efectivo contado ($)"
                  type="number"
                  fullWidth
                  value={countedCash}
                  onChange={e => setCountedCash(e.target.value)}
                  sx={{ mb: 2 }}
                  inputProps={{ min: 0, step: "0.01" }}
                />
                <TextField
                  label="Observaciones (opcional)"
                  multiline
                  rows={2}
                  fullWidth
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  sx={{ mb: 2 }}
                />

                {countedCash !== "" && preview && (
                  <Box sx={{ bgcolor: "#f9f9f9", border: "1px solid #e0e0e0", borderRadius: 2, p: 1.5, mb: 2 }}>
                    <Typography variant="body2">
                      Efectivo esperado: <strong>{fmtMoney(preview.expected_cash)}</strong>
                    </Typography>
                    <Typography variant="body2">
                      Efectivo contado: <strong>{fmtMoney(countedCash)}</strong>
                    </Typography>
                    <Typography variant="body2" color={parseFloat(countedCash) - parseFloat(preview.expected_cash) < 0 ? "error.main" : "success.main"} fontWeight={700}>
                      Diferencia: {parseFloat(countedCash) - parseFloat(preview.expected_cash) >= 0 ? "+" : ""}
                      {fmtMoney(parseFloat(countedCash) - parseFloat(preview.expected_cash))}
                    </Typography>
                  </Box>
                )}

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handleSubmit}
                  disabled={submitting || countedCash === ""}
                  startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <PointOfSaleIcon />}
                >
                  {submitting ? "Registrando..." : "Registrar Corte"}
                </Button>
              </>
            )}
          </Paper>
        </Grid>

        {/* RIGHT — historial */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <HistoryIcon fontSize="small" color="action" />
              <Typography variant="subtitle1" fontWeight={700}>Historial de cortes</Typography>
              <Typography variant="caption" color="text.secondary" ml="auto">
                {histTotal} corte{histTotal !== 1 ? "s" : ""} en total
              </Typography>
            </Box>

            {loadingHist ? (
              <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
            ) : history.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={4}>Sin cortes registrados</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Fecha/Hora</strong></TableCell>
                      <TableCell><strong>Por</strong></TableCell>
                      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}><strong>Período</strong></TableCell>
                      <TableCell align="right"><strong>Esperado</strong></TableCell>
                      <TableCell align="right"><strong>Contado</strong></TableCell>
                      <TableCell align="center"><strong>Diferencia</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.map(cut => (
                      <TableRow key={cut.id} hover>
                        <TableCell sx={{ whiteSpace: "nowrap", fontSize: "12px" }}>{fmt(cut.cut_at)}</TableCell>
                        <TableCell sx={{ fontSize: "12px" }}>{cut.cut_by}</TableCell>
                        <TableCell sx={{ fontSize: "11px", color: "text.secondary", display: { xs: "none", sm: "table-cell" } }}>
                          {fmt(cut.period_from)} → {fmt(cut.period_to)}
                        </TableCell>
                        <TableCell align="right">{fmtMoney(cut.expected_cash)}</TableCell>
                        <TableCell align="right">{fmtMoney(cut.counted_cash)}</TableCell>
                        <TableCell align="center">
                          <Tooltip title={cut.notes || ""} placement="top">
                            <span><DiffChip value={cut.difference} /></span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {totalPages > 1 && (
              <Box display="flex" justifyContent="center" alignItems="center" gap={2} mt={2}>
                <IconButton onClick={() => setHistPage(p => p - 1)} disabled={histPage === 0} size="small">
                  <ArrowBackIosNewIcon fontSize="small" />
                </IconButton>
                <Typography variant="caption">{histPage + 1} / {totalPages}</Typography>
                <IconButton onClick={() => setHistPage(p => p + 1)} disabled={histPage >= totalPages - 1} size="small">
                  <ArrowForwardIosIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
