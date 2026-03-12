import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Paper, Stack, Divider,
  TextField, Alert, CircularProgress, Chip,
  Switch, FormControlLabel, Grid, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import InventoryIcon from "@mui/icons-material/Inventory";
import LogoutIcon from "@mui/icons-material/Logout";
import StoreIcon from "@mui/icons-material/Store";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SaveIcon from "@mui/icons-material/Save";
import PercentIcon from "@mui/icons-material/Percent";
import BusinessIcon from "@mui/icons-material/Business";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import PaymentsIcon from "@mui/icons-material/Payments";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ScheduleIcon from "@mui/icons-material/Schedule";
import PeopleIcon from "@mui/icons-material/People";
import LockIcon from "@mui/icons-material/Lock";

const API = import.meta.env.VITE_API_URL || API;

export default function BusinessAdminDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");
  const claims = JSON.parse(localStorage.getItem("user_claims") || "{}");
  const activeBranchId = claims.active_branch_id || claims.branch_id || localStorage.getItem("branch_id");

  const [branches, setBranches] = useState([]);
  const [folioEdits, setFolioEdits] = useState({});
  const [savingFolio, setSavingFolio] = useState({});
  const [folioMsg, setFolioMsg] = useState({});
  const [usesIva, setUsesIva] = useState(true);
  const [savingIva, setSavingIva] = useState(false);
  const [ivaMsg, setIvaMsg] = useState(null);
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [discountMsg, setDiscountMsg] = useState(null);

  const [payConfig, setPayConfig] = useState({ payment_cash: true, payment_card: true, payment_points: false, allow_deferred: true, points_per_peso: 1, peso_per_point: 1 });
  const [savingPay, setSavingPay] = useState(false);
  const [payMsg, setPayMsg] = useState(null);

  const [urgencyConfig, setUrgencyConfig] = useState({ normal_days: 3, urgent_days: 1, extra_urgent_days: 0, urgent_pct: 20, extra_urgent_pct: 50 });
  const [discountConfig, setDiscountConfig] = useState({ discount_enabled: true, max_discount_pct: 50 });
  const [carouselHint, setCarouselHint] = useState("");
  const [savingUrgency, setSavingUrgency] = useState(false);
  const [urgencyMsg, setUrgencyMsg] = useState(null);

  const [showPwDialog, setShowPwDialog] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState(null);
  const [pwSaving, setPwSaving] = useState(false);

  const handleChangePw = async () => {
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) { setPwMsg({ type: "error", text: "Completa todos los campos" }); return; }
    if (pwForm.next.length < 6) { setPwMsg({ type: "error", text: "Mínimo 6 caracteres" }); return; }
    if (pwForm.next !== pwForm.confirm) { setPwMsg({ type: "error", text: "Las contraseñas no coinciden" }); return; }
    setPwSaving(true); setPwMsg(null);
    try {
      const adminId = claims.user_id;
      const res = await fetch(`${API}/admins/${adminId}/password`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwForm.next, current_password: pwForm.current }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.message || "Error al cambiar contraseña");
      setPwMsg({ type: "success", text: "Contraseña actualizada" });
      setTimeout(() => { setShowPwDialog(false); setPwForm({ current: "", next: "", confirm: "" }); setPwMsg(null); }, 1200);
    } catch (e) {
      setPwMsg({ type: "error", text: e.message });
    } finally {
      setPwSaving(false);
    }
  };

  useEffect(() => {
    if (!claims.business_id) return;
    fetch(`${API}/businesses/${claims.business_id}/branches`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        const list = d.branches || [];
        setBranches(list);
        const edits = {};
        list.forEach(b => {
          edits[b.id] = { prefix: b.folio_prefix || "", counter: b.folio_counter ?? 0 };
        });
        setFolioEdits(edits);
      })
      .catch(console.error);

    const branchId = activeBranchId;
    if (!branchId) return;
    fetch(`${API}/branches/${branchId}/config`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.uses_iva !== undefined) setUsesIva(d.uses_iva);
        setPayConfig({
          payment_cash: d.payment_cash ?? true,
          payment_card: d.payment_card ?? true,
          payment_points: d.payment_points ?? false,
          allow_deferred: d.allow_deferred ?? true,
          points_per_peso: d.points_per_peso ?? 1,
          peso_per_point: d.peso_per_point ?? 1,
        });
        setUrgencyConfig({
          normal_days: d.normal_days ?? 3,
          urgent_days: d.urgent_days ?? 1,
          extra_urgent_days: d.extra_urgent_days ?? 0,
          urgent_pct: d.urgent_pct ?? 20,
          extra_urgent_pct: d.extra_urgent_pct ?? 50,
        });
        setDiscountConfig({
          discount_enabled: d.discount_enabled ?? true,
          max_discount_pct: d.max_discount_pct ?? 50,
        });
        if (d.carousel_format_hint) setCarouselHint(d.carousel_format_hint);
      })
      .catch(console.error);
  }, []);

  const handleSaveFolio = async (branchId) => {
    setSavingFolio(p => ({ ...p, [branchId]: true }));
    setFolioMsg(p => ({ ...p, [branchId]: null }));
    try {
      const res = await fetch(`${API}/branches/${branchId}/folio`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          folio_prefix: folioEdits[branchId]?.prefix || "",
          folio_counter: parseInt(folioEdits[branchId]?.counter) || 0,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFolioMsg(p => ({ ...p, [branchId]: { type: "success", text: "Guardado correctamente" } }));
        setBranches(prev => prev.map(b => b.id === branchId ? { ...b, ...data } : b));
      } else {
        setFolioMsg(p => ({ ...p, [branchId]: { type: "error", text: data.message || "Error" } }));
      }
    } catch {
      setFolioMsg(p => ({ ...p, [branchId]: { type: "error", text: "Error de conexión" } }));
    } finally {
      setSavingFolio(p => ({ ...p, [branchId]: false }));
    }
  };

  const handleSaveIva = async () => {
    setSavingIva(true); setIvaMsg(null);
    try {
      const res = await fetch(`${API}/branches/${activeBranchId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uses_iva: usesIva }),
      });
      const data = await res.json();
      if (res.ok) setIvaMsg({ type: "success", text: "Configuración de IVA guardada" });
      else setIvaMsg({ type: "error", text: data.message || "Error al guardar" });
    } catch { setIvaMsg({ type: "error", text: "Error de conexión" }); }
    finally { setSavingIva(false); }
  };

  const handleSaveDiscount = async () => {
    setSavingDiscount(true); setDiscountMsg(null);
    try {
      const res = await fetch(`${API}/branches/${activeBranchId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ discount_enabled: discountConfig.discount_enabled, max_discount_pct: discountConfig.max_discount_pct }),
      });
      const data = await res.json();
      if (res.ok) setDiscountMsg({ type: "success", text: "Configuración de descuentos guardada" });
      else setDiscountMsg({ type: "error", text: data.message || "Error al guardar" });
    } catch { setDiscountMsg({ type: "error", text: "Error de conexión" }); }
    finally { setSavingDiscount(false); }
  };

  const handleSavePayConfig = async () => {
    setSavingPay(true); setPayMsg(null);
    try {
      const res = await fetch(`${API}/branches/${activeBranchId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payConfig),
      });
      const data = await res.json();
      if (res.ok) setPayMsg({ type: "success", text: "Configuración de pagos guardada" });
      else setPayMsg({ type: "error", text: data.message || "Error al guardar" });
    } catch { setPayMsg({ type: "error", text: "Error de conexión" }); }
    finally { setSavingPay(false); }
  };

  const handleSaveUrgency = async () => {
    setSavingUrgency(true); setUrgencyMsg(null);
    try {
      const res = await fetch(`${API}/branches/${activeBranchId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...urgencyConfig, ...discountConfig, carousel_format_hint: carouselHint }),
      });
      if (res.ok) setUrgencyMsg({ type: "success", text: "Configuración guardada" });
      else setUrgencyMsg({ type: "error", text: "Error al guardar" });
    } catch { setUrgencyMsg({ type: "error", text: "Error de conexión" }); }
    finally { setSavingUrgency(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("role");
    localStorage.removeItem("business_id");
    localStorage.removeItem("user_claims");
    navigate("/login");
  };

  const currentBranch = branches.find(b => b.id === activeBranchId);

  const btnSx = { py: 2.5, borderRadius: 2, fontWeight: 600, height: "100%" };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", p: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 960, mx: "auto" }}>
        <Typography variant="h5" fontWeight={700} mb={0.5}>Panel de Administración</Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Gestiona las operaciones, configuración y personal de tu negocio.
        </Typography>

        {/* === 8 BOTONES EN 4 COLUMNAS === */}
        <Box
          display="grid"
          sx={{ gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2, mb: 4 }}
        >
          <Button fullWidth variant="contained" color="primary" size="large"
            startIcon={<ViewModuleIcon />}
            onClick={() => navigate("/panel-operativo")} sx={btnSx}>
            Panel Operativo
          </Button>
          <Button fullWidth variant="contained" color="secondary" size="large"
            startIcon={<InventoryIcon />}
            onClick={() => navigate("/manage-services-business")} sx={btnSx}>
            Catálogo
          </Button>
          <Button fullWidth variant="outlined" color="primary" size="large"
            startIcon={<PeopleIcon />}
            onClick={() => navigate("/employees")} sx={btnSx}>
            Empleados
          </Button>
          <Button fullWidth variant="outlined" color="secondary" size="large"
            startIcon={<BusinessIcon />}
            onClick={() => navigate("/business-info")} sx={btnSx}>
            Info del Negocio
          </Button>
          <Button fullWidth variant="outlined" color="primary" size="large"
            startIcon={<PeopleAltIcon />}
            onClick={() => navigate("/manage-client-config")} sx={btnSx}>
            Tipos y Clientes
          </Button>
          <Button fullWidth variant="outlined" color="success" size="large"
            startIcon={<LocalOfferIcon />}
            onClick={() => navigate("/manage-promotions")} sx={btnSx}>
            Promociones
          </Button>
          <Button fullWidth variant="outlined" color="warning" size="large"
            startIcon={<ScheduleIcon />}
            onClick={() => navigate("/business-schedule")} sx={btnSx}>
            Horarios y Festivos
          </Button>
          {claims.role !== "branch_manager" && (
            <Button fullWidth variant="outlined" color="inherit" size="large"
              startIcon={<StoreIcon />}
              onClick={() => { localStorage.removeItem("business_id"); navigate("/select-branch"); }}
              sx={{ ...btnSx, borderColor: "divider", color: "text.primary" }}>
              Cambiar Sucursal
            </Button>
          )}
        </Box>

        {/* === NÚMERO DE NOTA (solo sucursal activa) === */}
        <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <Box display="flex" alignItems="center" gap={1.5} mb={1}>
            <ReceiptLongIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>Número de Nota</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Configura el prefijo y número inicial de nota para esta sucursal.
          </Typography>
          {!currentBranch ? (
            <Typography variant="body2" color="text.secondary">Cargando sucursal...</Typography>
          ) : (
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <StoreIcon fontSize="small" color="action" />
                <Typography variant="subtitle1" fontWeight={700}>{currentBranch.name}</Typography>
                <Chip
                  label={`Próximo folio: ${(folioEdits[currentBranch.id]?.prefix || "") + String((parseInt(folioEdits[currentBranch.id]?.counter) || 0) + 1).padStart(4, "0")}`}
                  size="small" color="primary" variant="outlined"
                />
              </Box>
              <Grid container spacing={2} alignItems="flex-start">
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth label="Prefijo" size="medium"
                    placeholder="Ej. A, TIN, 2024-"
                    value={folioEdits[currentBranch.id]?.prefix || ""}
                    onChange={e => setFolioEdits(p => ({ ...p, [currentBranch.id]: { ...p[currentBranch.id], prefix: e.target.value } }))}
                    inputProps={{ maxLength: 20 }}
                    helperText="Letras o números antes del folio"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth label="Número inicial" size="medium" type="number"
                    value={folioEdits[currentBranch.id]?.counter ?? 0}
                    onChange={e => setFolioEdits(p => ({ ...p, [currentBranch.id]: { ...p[currentBranch.id], counter: e.target.value } }))}
                    inputProps={{ min: 0 }}
                    helperText="La próxima nota será este número + 1"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button fullWidth variant="contained" size="large"
                    startIcon={savingFolio[currentBranch.id] ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                    onClick={() => handleSaveFolio(currentBranch.id)}
                    disabled={savingFolio[currentBranch.id]}
                    sx={{ mt: 0.5, py: 1.6 }}>
                    Guardar
                  </Button>
                </Grid>
              </Grid>
              {folioMsg[currentBranch.id] && (
                <Alert severity={folioMsg[currentBranch.id].type} sx={{ mt: 1.5 }}>
                  {folioMsg[currentBranch.id].text}
                </Alert>
              )}
            </Box>
          )}
        </Paper>

        {/* === IVA + DESCUENTO EN MISMO RENGLÓN === */}
        <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                <PercentIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>Configuración de IVA</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Activa o desactiva el IVA (16%) en las notas de esta sucursal.
              </Typography>
              <FormControlLabel
                control={<Switch checked={usesIva} onChange={e => setUsesIva(e.target.checked)} color="primary" size="medium" />}
                label={<Typography variant="body1" fontWeight={500}>{usesIva ? "IVA activado (16%)" : "Sin IVA"}</Typography>}
              />
              <Box mt={1.5}>
                <Button variant="contained" size="medium"
                  startIcon={savingIva ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                  onClick={handleSaveIva} disabled={savingIva}>
                  Guardar
                </Button>
              </Box>
              {ivaMsg && <Alert severity={ivaMsg.type} sx={{ mt: 1.5 }}>{ivaMsg.text}</Alert>}
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                <PercentIcon color="secondary" />
                <Typography variant="h6" fontWeight={700}>Configuración de Descuentos</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Define si los cajeros pueden aplicar descuentos y hasta qué porcentaje.
              </Typography>
              <FormControlLabel
                control={<Switch checked={discountConfig.discount_enabled} onChange={e => setDiscountConfig(p => ({ ...p, discount_enabled: e.target.checked }))} color="primary" />}
                label="Descuentos habilitados" />
              <TextField label="Descuento máximo sin aprobación (%)" type="number" size="small" fullWidth
                value={discountConfig.max_discount_pct}
                onChange={e => setDiscountConfig(p => ({ ...p, max_discount_pct: parseFloat(e.target.value) || 0 }))}
                disabled={!discountConfig.discount_enabled}
                helperText="Sobre este % se pide código del gerente/dueño"
                InputProps={{ endAdornment: <InputAdornment position="end"><PercentIcon fontSize="small" /></InputAdornment>, inputProps: { min: 0, max: 100 } }}
                sx={{ mt: 1.5 }}
              />
              <Box mt={1.5}>
                <Button variant="contained" size="medium"
                  startIcon={savingDiscount ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                  onClick={handleSaveDiscount} disabled={savingDiscount}>
                  Guardar
                </Button>
              </Box>
              {discountMsg && <Alert severity={discountMsg.type} sx={{ mt: 1.5 }}>{discountMsg.text}</Alert>}
            </Grid>
          </Grid>
        </Paper>

        {/* === MÉTODOS DE PAGO === */}
        <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <Box display="flex" alignItems="center" gap={1.5} mb={1}>
            <PaymentsIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>Métodos de Pago</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Activa los métodos de pago disponibles para tus cajeros y configura el programa de puntos.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControlLabel control={<Switch checked={payConfig.payment_cash} onChange={e => setPayConfig(p => ({ ...p, payment_cash: e.target.checked }))} color="primary" />} label="Efectivo" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel control={<Switch checked={payConfig.payment_card} onChange={e => setPayConfig(p => ({ ...p, payment_card: e.target.checked }))} color="primary" />} label="Tarjeta" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel control={<Switch checked={payConfig.payment_points} onChange={e => setPayConfig(p => ({ ...p, payment_points: e.target.checked }))} color="primary" />} label="Puntos de lealtad" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel control={<Switch checked={payConfig.allow_deferred} onChange={e => setPayConfig(p => ({ ...p, allow_deferred: e.target.checked }))} color="primary" />} label="Permitir pago posterior" />
            </Grid>
            {payConfig.payment_points && (<>
              <Grid item xs={12} sm={6}>
                <TextField label="Puntos por cada $1 gastado" type="number" size="small" fullWidth
                  value={payConfig.points_per_peso}
                  onChange={e => setPayConfig(p => ({ ...p, points_per_peso: parseFloat(e.target.value) || 1 }))}
                  InputProps={{ inputProps: { min: 0.01, step: 0.1 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Valor de 1 punto en $" type="number" size="small" fullWidth
                  value={payConfig.peso_per_point}
                  onChange={e => setPayConfig(p => ({ ...p, peso_per_point: parseFloat(e.target.value) || 1 }))}
                  InputProps={{ inputProps: { min: 0.01, step: 0.1 } }}
                />
              </Grid>
            </>)}
          </Grid>
          <Box mt={2}>
            <Button variant="contained" size="medium"
              startIcon={savingPay ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={handleSavePayConfig} disabled={savingPay}>
              Guardar
            </Button>
          </Box>
          {payMsg && <Alert severity={payMsg.type} sx={{ mt: 2 }}>{payMsg.text}</Alert>}
        </Paper>

        {/* === URGENCIA Y TIEMPOS DE ENTREGA === */}
        <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <Box display="flex" alignItems="center" gap={1.5} mb={1}>
            <AccessTimeIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>Tiempos de Entrega y Urgencia</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Define los días hábiles de entrega y el incremento de precio por urgencia.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField label="Normal (días hábiles)" type="number" size="small" fullWidth
                value={urgencyConfig.normal_days}
                onChange={e => setUrgencyConfig(p => ({ ...p, normal_days: parseInt(e.target.value) || 0 }))}
                InputProps={{ inputProps: { min: 0 } }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Urgente (días hábiles)" type="number" size="small" fullWidth
                value={urgencyConfig.urgent_days}
                onChange={e => setUrgencyConfig(p => ({ ...p, urgent_days: parseInt(e.target.value) || 0 }))}
                InputProps={{ inputProps: { min: 0 } }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Extra urgente (días hábiles)" type="number" size="small" fullWidth
                value={urgencyConfig.extra_urgent_days}
                onChange={e => setUrgencyConfig(p => ({ ...p, extra_urgent_days: parseInt(e.target.value) || 0 }))}
                InputProps={{ inputProps: { min: 0 }, endAdornment: <InputAdornment position="end">0=mismo día</InputAdornment> }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="% incremento Urgente" type="number" size="small" fullWidth
                value={urgencyConfig.urgent_pct}
                onChange={e => setUrgencyConfig(p => ({ ...p, urgent_pct: parseFloat(e.target.value) || 0 }))}
                InputProps={{ endAdornment: <InputAdornment position="end"><PercentIcon fontSize="small" /></InputAdornment>, inputProps: { min: 0 } }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="% incremento Extra urgente" type="number" size="small" fullWidth
                value={urgencyConfig.extra_urgent_pct}
                onChange={e => setUrgencyConfig(p => ({ ...p, extra_urgent_pct: parseFloat(e.target.value) || 0 }))}
                InputProps={{ endAdornment: <InputAdornment position="end"><PercentIcon fontSize="small" /></InputAdornment>, inputProps: { min: 0 } }} />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Formato del carrusel (ejemplo orientativo)"
                fullWidth size="small"
                value={carouselHint}
                onChange={e => setCarouselHint(e.target.value)}
                placeholder="Ej. A-01, 105, B-07..."
                helperText="Muestra el formato esperado al asignar posición en Producción"
              />
            </Grid>
          </Grid>
          <Box mt={2}>
            <Button variant="contained" size="medium"
              startIcon={savingUrgency ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={handleSaveUrgency} disabled={savingUrgency}>Guardar</Button>
          </Box>
          {urgencyMsg && <Alert severity={urgencyMsg.type} sx={{ mt: 2 }}>{urgencyMsg.text}</Alert>}
        </Paper>

        {/* === CERRAR SESIÓN === */}
        <Box display="flex" justifyContent="flex-end" gap={2}>
          <Button variant="outlined" color="info" startIcon={<LockIcon />} onClick={() => setShowPwDialog(true)}>
            Cambiar Contraseña
          </Button>
          <Button variant="text" color="error" startIcon={<LogoutIcon />} onClick={handleLogout}>
            Cerrar Sesión
          </Button>
        </Box>

        {/* === CHANGE PASSWORD DIALOG === */}
        <Dialog open={showPwDialog} onClose={() => { setShowPwDialog(false); setPwForm({ current: "", next: "", confirm: "" }); setPwMsg(""); }} maxWidth="xs" fullWidth>
          <DialogTitle>Cambiar Contraseña</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
            {pwMsg && <Alert severity={pwMsg.type}>{pwMsg.text}</Alert>}
            <TextField type="password" fullWidth label="Contraseña actual" value={pwForm.current}
              onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} />
            <TextField type="password" fullWidth label="Nueva contraseña" value={pwForm.next}
              onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} helperText="Mínimo 6 caracteres" />
            <TextField type="password" fullWidth label="Confirmar nueva contraseña" value={pwForm.confirm}
              onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowPwDialog(false)}>Cancelar</Button>
            <Button variant="contained" onClick={handleChangePw} disabled={pwSaving}>
              {pwSaving ? <CircularProgress size={18} /> : "Guardar"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
