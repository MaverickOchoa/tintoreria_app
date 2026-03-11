import React, { useState, useRef, useEffect } from "react";
import {
  Box, Paper, Typography, TextField, Button, Chip, Alert,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  LinearProgress, Divider, CircularProgress, InputAdornment, IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CelebrationIcon from "@mui/icons-material/Celebration";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";

const API = import.meta.env.VITE_API_URL || API;

const STATUS_COLORS = {
  "Pendiente": "default",
  "En Proceso": "info",
  "En Producción": "warning",
  "Listo": "success",
  "Entregado": "primary",
  "Cancelado": "error",
};

export default function ProductionView() {
  const token = localStorage.getItem("access_token");
  const claims = JSON.parse(localStorage.getItem("user_claims") || "{}");

  const [folioInput, setFolioInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [order, setOrder] = useState(null);
  const [tickets, setTickets] = useState([]);

  const [ticketInput, setTicketInput] = useState("");
  const [scanError, setScanError] = useState(null);
  const [scanSuccess, setScanSuccess] = useState(null);
  const [scanning, setScanning] = useState(false);

  const [carouselInput, setCarouselInput] = useState("");
  const [carouselHint, setCarouselHint] = useState("");
  const [assigningCarousel, setAssigningCarousel] = useState(false);
  const [carouselMsg, setCarouselMsg] = useState(null);

  const folioRef = useRef(null);
  const ticketRef = useRef(null);

  useEffect(() => {
    if (folioRef.current) folioRef.current.focus();
    if (claims.business_id) {
      fetch(`${API}/businesses/${claims.business_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).then(d => {
        if (d.carousel_format_hint) setCarouselHint(d.carousel_format_hint);
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (order && tickets.length > 0 && ticketRef.current) {
      ticketRef.current.focus();
    }
  }, [order, tickets]);

  const searchFolio = async () => {
    const folio = folioInput.trim().toUpperCase();
    if (!folio) return;
    setSearching(true);
    setSearchError(null);
    setOrder(null);
    setTickets([]);
    setScanError(null);
    setScanSuccess(null);
    setCarouselMsg(null);
    try {
      const res = await fetch(`${API}/api/v1/orders/by-folio/${folio}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setOrder(data);
        setTickets(data.garment_tickets || []);
      } else {
        setSearchError(data.message || "Orden no encontrada");
      }
    } catch {
      setSearchError("Error de conexión");
    } finally {
      setSearching(false);
    }
  };

  const scanTicket = async () => {
    const code = ticketInput.trim();
    if (!code || !order) return;
    setScanning(true);
    setScanError(null);
    setScanSuccess(null);
    try {
      const res = await fetch(`${API}/api/v1/orders/${order.id}/scan-garment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ticket_code: code }),
      });
      const data = await res.json();
      if (res.ok) {
        setTickets(data.tickets);
        const scannedTicket = data.tickets.find(t => t.ticket_code === code);
        setScanSuccess(`✓ ${scannedTicket?.item_name || "Prenda"} escaneada correctamente`);
        setTicketInput("");
        if (ticketRef.current) ticketRef.current.focus();
      } else if (data.error === "prenda_equivocada") {
        setScanError(`⚠ Esta prenda pertenece a la orden: ${data.belongs_to}`);
        setTicketInput("");
      } else {
        setScanError(data.message || "Ticket no encontrado");
        setTicketInput("");
      }
    } catch {
      setScanError("Error de conexión");
    } finally {
      setScanning(false);
    }
  };

  const assignCarousel = async () => {
    const pos = carouselInput.trim();
    if (!pos || !order) return;
    setAssigningCarousel(true);
    setCarouselMsg(null);
    try {
      const res = await fetch(`${API}/api/v1/orders/${order.id}/assign-carousel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ carousel_position: pos }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrder(data.order);
        setCarouselMsg({ type: "success", text: `🎉 ¡Orden lista! Posición: ${pos}` });
      } else {
        setCarouselMsg({ type: "error", text: data.message });
      }
    } catch {
      setCarouselMsg({ type: "error", text: "Error de conexión" });
    } finally {
      setAssigningCarousel(false);
    }
  };

  const scannedCount = tickets.filter(t => t.scanned).length;
  const totalCount = tickets.length;
  const allScanned = totalCount > 0 && scannedCount === totalCount;

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>Producción</Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <TextField
            inputRef={folioRef}
            size="small"
            placeholder="Buscar folio..."
            value={folioInput}
            onChange={e => setFolioInput(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === "Enter") searchFolio(); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <QrCodeScannerIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: 220 }}
          />
          <Button variant="contained" onClick={searchFolio} disabled={searching} size="small">
            {searching ? <CircularProgress size={16} /> : <SearchIcon />}
          </Button>
        </Box>
      </Box>

      {searchError && <Alert severity="error" sx={{ mb: 2 }}>{searchError}</Alert>}

      {!order && !searchError && (
        <Paper elevation={1} sx={{ p: 6, textAlign: "center", borderRadius: 3 }}>
          <QrCodeScannerIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
          <Typography color="text.secondary">
            Ingresa o escanea el folio de una orden para comenzar
          </Typography>
        </Paper>
      )}

      {order && (
        <Box display="flex" gap={3} flexWrap="wrap">
          {/* INFO PANEL */}
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3, minWidth: 260, flex: "0 0 auto" }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              Nota {order.folio}
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Box>
                <Typography variant="caption" color="text.secondary">Cliente</Typography>
                <Typography fontWeight={600}>{order.client_name || "—"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Total</Typography>
                <Typography fontWeight={600}>${parseFloat(order.total_amount).toFixed(2)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Entrega</Typography>
                <Typography variant="body2">
                  {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString("es-MX") : "—"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Estatus</Typography>
                <Box mt={0.5}>
                  <Chip
                    label={order.status}
                    color={STATUS_COLORS[order.status] || "default"}
                    size="small"
                  />
                </Box>
              </Box>
              {order.carousel_position && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Posición carrusel</Typography>
                  <Typography fontWeight={700} color="success.main">{order.carousel_position}</Typography>
                </Box>
              )}
              {order.created_by_name && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Creado por</Typography>
                  <Typography variant="body2">{order.created_by_name}</Typography>
                </Box>
              )}
            </Box>

            <Button
              variant="outlined"
              size="small"
              fullWidth
              sx={{ mt: 2 }}
              onClick={() => {
                setOrder(null);
                setTickets([]);
                setFolioInput("");
                setScanError(null);
                setScanSuccess(null);
                setCarouselMsg(null);
                setTimeout(() => { if (folioRef.current) folioRef.current.focus(); }, 100);
              }}
            >
              Nueva búsqueda
            </Button>
          </Paper>

          {/* SCAN PANEL */}
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3, flex: 1, minWidth: 300 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              Escaneo de prendas
            </Typography>

            <Box display="flex" gap={1} mb={2}>
              <TextField
                inputRef={ticketRef}
                size="small"
                placeholder="Escanear o ingresar código de ticket..."
                value={ticketInput}
                onChange={e => setTicketInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") scanTicket(); }}
                fullWidth
                disabled={order.status === "Listo" || order.status === "Entregado"}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <QrCodeScannerIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="contained"
                onClick={scanTicket}
                disabled={scanning || !ticketInput.trim() || order.status === "Listo" || order.status === "Entregado"}
              >
                {scanning ? <CircularProgress size={16} /> : "OK"}
              </Button>
            </Box>

            {scanError && (
              <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 1 }} onClose={() => setScanError(null)}>
                {scanError}
              </Alert>
            )}
            {scanSuccess && (
              <Alert severity="success" sx={{ mb: 1 }} onClose={() => setScanSuccess(null)}>
                {scanSuccess}
              </Alert>
            )}

            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography variant="body2" color="text.secondary">
                  Progreso: {scannedCount} / {totalCount} prendas
                </Typography>
                <Typography variant="body2" fontWeight={600} color={allScanned ? "success.main" : "text.secondary"}>
                  {totalCount > 0 ? Math.round((scannedCount / totalCount) * 100) : 0}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={totalCount > 0 ? (scannedCount / totalCount) * 100 : 0}
                color={allScanned ? "success" : "primary"}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>

<TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Prenda</TableCell>
                    <TableCell>Código</TableCell>
                    <TableCell align="center">Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tickets.map(t => (
                    <TableRow
                      key={t.id}
                      sx={{ bgcolor: t.scanned ? "success.50" : "inherit" }}
                    >
                      <TableCell>{t.quantity_index}</TableCell>
                      <TableCell>{t.item_name}</TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: "11px" }}>{t.ticket_code}</TableCell>
                      <TableCell align="center">
                        {t.scanned
                          ? <CheckCircleIcon color="success" fontSize="small" />
                          : <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {allScanned && order.status !== "Listo" && order.status !== "Entregado" && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <CelebrationIcon color="success" />
                  <Typography fontWeight={700} color="success.main">
                    ¡Todas las prendas escaneadas!
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Asigna la posición en el carrusel para marcar la orden como lista.
                </Typography>
                <Box display="flex" gap={1}>
                  <TextField
                    size="small"
                    placeholder={carouselHint || "Ej. A-42, 105, B-7..."}
                    value={carouselInput}
                    onChange={e => setCarouselInput(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === "Enter") assignCarousel(); }}
                    fullWidth
                    label="Posición en carrusel"
                    autoFocus
                  />
                  <Button
                    variant="contained"
                    color="success"
                    onClick={assignCarousel}
                    disabled={assigningCarousel || !carouselInput.trim()}
                  >
                    {assigningCarousel ? <CircularProgress size={16} /> : "Asignar"}
                  </Button>
                </Box>
                {carouselMsg && (
                  <Alert severity={carouselMsg.type} sx={{ mt: 1 }}>
                    {carouselMsg.text}
                  </Alert>
                )}
              </>
            )}

            {order.status === "Listo" && (
              <Alert severity="success" icon={<CelebrationIcon />} sx={{ mt: 2 }}>
                Orden en posición <strong>{order.carousel_position}</strong> — Lista para entrega
              </Alert>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
}
