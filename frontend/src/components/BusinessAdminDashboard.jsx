import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Paper,
  TextField, Alert, CircularProgress, Chip,
  Switch, FormControlLabel, Grid, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Accordion, AccordionSummary, AccordionDetails, Divider,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import InventoryIcon from "@mui/icons-material/Inventory";
import LogoutIcon from "@mui/icons-material/Logout";
import StoreIcon from "@mui/icons-material/Store";
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
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";

const API = import.meta.env.VITE_API_URL || "";

const DEFAULT_BRANCH_CONFIG = {
  uses_iva: true,
  payment_cash: true,
  payment_card: true,
  payment_points: false,
  allow_deferred: true,
  points_per_peso: 1,
  peso_per_point: 1,
  discount_enabled: true,
  max_discount_pct: 50,
  normal_days: 3,
  urgent_days: 1,
  extra_urgent_days: 0,
  urgent_pct: 20,
  extra_urgent_pct: 50,
  carousel_format_hint: "",
  require_scan: true,
};

export default function BusinessAdminDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");
  const claims = JSON.parse(localStorage.getItem("user_claims") || "{}");
  const getJwtRole = () => {
    try {
      const t = localStorage.getItem("access_token");
      if (!t) return null;
      return JSON.parse(atob(t.split(".")[1])).role || null;
    } catch { return null; }
  };
  const jwtRole = getJwtRole() || claims.role;
  const activeBranchId = claims.active_branch_id || claims.branch_id || localStorage.getItem("branch_id");

  const [branches, setBranches] = useState([]);
  const [folioEdits, setFolioEdits] = useState({});
  const [savingFolio, setSavingFolio] = useState({});
  const [folioMsg, setFolioMsg] = useState({});

  const [branchConfigs, setBranchConfigs] = useState({});
  const [savingBranchConfig, setSavingBranchConfig] = useState({});
  const [branchConfigMsg, setBranchConfigMsg] = useState({});

  const [expandedBranch, setExpandedBranch] = useState(activeBranchId ? String(activeBranchId) : false);

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
        list.forEach(b => {
          Promise.all([
            fetch(`${API}/branches/${b.id}/config`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
            fetch(`${API}/branches/${b.id}/scan-config`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
          ])
            .then(([cfg, scanCfg]) => {
              setBranchConfigs(prev => ({
                ...prev,
                [b.id]: {
                  ...DEFAULT_BRANCH_CONFIG,
                  ...cfg,
                  require_scan: scanCfg.require_scan !== undefined ? Boolean(scanCfg.require_scan) : true,
                },
              }));
            })
            .catch(() => {
              setBranchConfigs(prev => ({ ...prev, [b.id]: { ...DEFAULT_BRANCH_CONFIG } }));
            });
        });
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
        setFolioMsg(p => ({ ...p, [branchId]: { type: "success", text: "Guardado" } }));
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

  const updateBranchConfig = (branchId, field, value) => {
    setBranchConfigs(prev => ({
      ...prev,
      [branchId]: { ...(prev[branchId] || DEFAULT_BRANCH_CONFIG), [field]: value },
    }));
  };

  const handleSaveBranchConfig = async (branchId) => {
    setSavingBranchConfig(p => ({ ...p, [branchId]: true }));
    setBranchConfigMsg(p => ({ ...p, [branchId]: null }));
    const cfg = branchConfigs[branchId] || DEFAULT_BRANCH_CONFIG;
    try {
      const [res1, res2] = await Promise.all([
        fetch(`${API}/branches/${branchId}/config`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            uses_iva: cfg.uses_iva,
            payment_cash: cfg.payment_cash,
            payment_card: cfg.payment_card,
            payment_points: cfg.payment_points,
            allow_deferred: cfg.allow_deferred,
            points_per_peso: cfg.points_per_peso,
            peso_per_point: cfg.peso_per_point,
            discount_enabled: cfg.discount_enabled,
            max_discount_pct: cfg.max_discount_pct,
            normal_days: cfg.normal_days,
            urgent_days: cfg.urgent_days,
            extra_urgent_days: cfg.extra_urgent_days,
            urgent_pct: cfg.urgent_pct,
            extra_urgent_pct: cfg.extra_urgent_pct,
            carousel_format_hint: cfg.carousel_format_hint,
            require_scan: cfg.require_scan,
          }),
        }),
        fetch(`${API}/branches/${branchId}/scan-config`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ require_scan: Boolean(cfg.require_scan) }),
        }),
      ]);
      const data = await res1.json().catch(() => ({}));
      const scanData = await res2.json().catch(() => ({}));
      if (res1.ok && res2.ok) {
        setBranchConfigMsg(p => ({ ...p, [branchId]: { type: "success", text: "Configuración guardada" } }));
        setBranchConfigs(prev => ({
          ...prev,
          [branchId]: {
            ...DEFAULT_BRANCH_CONFIG,
            ...data,
            require_scan: scanData.require_scan !== undefined ? Boolean(scanData.require_scan) : Boolean(cfg.require_scan),
          },
        }));
      } else {
        const errMsg = (!res1.ok ? (data.message || "Error config") : "") + (!res2.ok ? (scanData.message || " Error escaneo") : "");
        setBranchConfigMsg(p => ({ ...p, [branchId]: { type: "error", text: errMsg || "Error al guardar" } }));
      }
    } catch {
      setBranchConfigMsg(p => ({ ...p, [branchId]: { type: "error", text: "Error de conexión" } }));
    } finally {
      setSavingBranchConfig(p => ({ ...p, [branchId]: false }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("role");
    localStorage.removeItem("business_id");
    localStorage.removeItem("user_claims");
    navigate("/login");
  };

  const btnSx = { py: 2.5, borderRadius: 2, fontWeight: 600, height: "100%" };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", p: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 960, mx: "auto" }}>
        <Typography variant="h5" fontWeight={700} mb={0.5}>Panel de Administración</Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Gestiona las operaciones, configuración y personal de tu negocio.
        </Typography>

        {/* === BOTONES DE NAVEGACIÓN === */}
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
          {jwtRole !== "branch_manager" && (
            <Button fullWidth variant="outlined" color="inherit" size="large"
              startIcon={<StoreIcon />}
              onClick={() => { localStorage.removeItem("business_id"); navigate("/select-branch"); }}
              sx={{ ...btnSx, borderColor: "divider", color: "text.primary" }}>
              Cambiar Sucursal
            </Button>
          )}
        </Box>

        {/* === CONFIGURACIÓN POR SUCURSAL === */}
        <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <Box display="flex" alignItems="center" gap={1.5} mb={1}>
            <StoreIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>Configuración por Sucursal</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Cada sucursal tiene ajustes independientes. Expande la sucursal que quieres configurar.
          </Typography>

          {branches.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Cargando sucursales...</Typography>
          ) : (
            branches.map(branch => {
              const cfg = branchConfigs[branch.id] || DEFAULT_BRANCH_CONFIG;
              const isActive = String(branch.id) === String(activeBranchId);
              const saving = savingBranchConfig[branch.id] || false;
              const msg = branchConfigMsg[branch.id] || null;

              return (
                <Accordion
                  key={branch.id}
                  expanded={expandedBranch === String(branch.id)}
                  onChange={(_, open) => setExpandedBranch(open ? String(branch.id) : false)}
                  sx={{ mb: 1, borderRadius: 2, "&:before": { display: "none" }, border: "1px solid", borderColor: isActive ? "primary.main" : "divider" }}
                  elevation={0}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <StoreIcon fontSize="small" color={isActive ? "primary" : "action"} />
                      <Typography fontWeight={700}>{branch.name}</Typography>
                      {isActive && <Chip label="Sucursal activa" size="small" color="primary" />}
                      {branchConfigs[branch.id] ? (
                        <Chip
                          icon={<QrCodeScannerIcon />}
                          label={cfg.require_scan ? "Escaneo ON" : "Escaneo OFF"}
                          size="small"
                          color={cfg.require_scan ? "success" : "default"}
                          variant="outlined"
                        />
                      ) : (
                        <CircularProgress size={14} />
                      )}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    {!branchConfigs[branch.id] ? (
                      <Box display="flex" justifyContent="center" py={3}><CircularProgress /></Box>
                    ) : (
                      <Box>
                        {/* Número de nota */}
                        <Typography variant="subtitle2" fontWeight={700} mb={1.5} color="text.secondary">
                          NÚMERO DE NOTA
                        </Typography>
                        <Grid container spacing={2} mb={3}>
                          <Grid item xs={12} sm={4}>
                            <Box display="flex" gap={1} alignItems="center" mb={1}>
                              <Chip
                                label={`Próximo: ${(folioEdits[branch.id]?.prefix || "") + String((parseInt(folioEdits[branch.id]?.counter) || 0) + 1).padStart(4, "0")}`}
                                size="small" color="primary" variant="outlined"
                              />
                            </Box>
                            <TextField fullWidth label="Prefijo" size="small"
                              placeholder="Ej. A, TIN-"
                              value={folioEdits[branch.id]?.prefix || ""}
                              onChange={e => setFolioEdits(p => ({ ...p, [branch.id]: { ...p[branch.id], prefix: e.target.value } }))}
                              inputProps={{ maxLength: 20 }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <TextField fullWidth label="Número inicial" size="small" type="number"
                              value={folioEdits[branch.id]?.counter ?? 0}
                              onChange={e => setFolioEdits(p => ({ ...p, [branch.id]: { ...p[branch.id], counter: e.target.value } }))}
                              inputProps={{ min: 0 }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Button fullWidth variant="outlined" size="medium"
                              startIcon={savingFolio[branch.id] ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                              onClick={() => handleSaveFolio(branch.id)}
                              disabled={savingFolio[branch.id]}>
                              Guardar folio
                            </Button>
                          </Grid>
                          {folioMsg[branch.id] && (
                            <Grid item xs={12}>
                              <Alert severity={folioMsg[branch.id].type} sx={{ py: 0 }}>{folioMsg[branch.id].text}</Alert>
                            </Grid>
                          )}
                        </Grid>

                        <Divider sx={{ mb: 2 }} />

                        {/* IVA y Descuentos */}
                        <Typography variant="subtitle2" fontWeight={700} mb={1.5} color="text.secondary">
                          IVA Y DESCUENTOS
                        </Typography>
                        <Grid container spacing={2} mb={2}>
                          <Grid item xs={12} sm={6}>
                            <FormControlLabel
                              control={<Switch checked={cfg.uses_iva} onChange={e => updateBranchConfig(branch.id, "uses_iva", e.target.checked)} color="primary" />}
                              label={cfg.uses_iva ? "IVA activado (16%)" : "Sin IVA"}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <FormControlLabel
                              control={<Switch checked={cfg.discount_enabled} onChange={e => updateBranchConfig(branch.id, "discount_enabled", e.target.checked)} color="primary" />}
                              label="Descuentos habilitados"
                            />
                          </Grid>
                          {cfg.discount_enabled && (
                            <Grid item xs={12} sm={6}>
                              <TextField label="Descuento máximo (%)" type="number" size="small" fullWidth
                                value={cfg.max_discount_pct}
                                onChange={e => updateBranchConfig(branch.id, "max_discount_pct", parseFloat(e.target.value) || 0)}
                                helperText="Sobre este % se pide aprobación del gerente"
                                InputProps={{ endAdornment: <InputAdornment position="end"><PercentIcon fontSize="small" /></InputAdornment>, inputProps: { min: 0, max: 100 } }}
                              />
                            </Grid>
                          )}
                        </Grid>

                        <Divider sx={{ mb: 2 }} />

                        {/* Métodos de pago */}
                        <Typography variant="subtitle2" fontWeight={700} mb={1.5} color="text.secondary">
                          MÉTODOS DE PAGO
                        </Typography>
                        <Grid container spacing={1} mb={2}>
                          <Grid item xs={6} sm={3}>
                            <FormControlLabel control={<Switch checked={cfg.payment_cash} onChange={e => updateBranchConfig(branch.id, "payment_cash", e.target.checked)} size="small" />} label="Efectivo" />
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <FormControlLabel control={<Switch checked={cfg.payment_card} onChange={e => updateBranchConfig(branch.id, "payment_card", e.target.checked)} size="small" />} label="Tarjeta" />
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <FormControlLabel control={<Switch checked={cfg.payment_points} onChange={e => updateBranchConfig(branch.id, "payment_points", e.target.checked)} size="small" />} label="Puntos" />
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <FormControlLabel control={<Switch checked={cfg.allow_deferred} onChange={e => updateBranchConfig(branch.id, "allow_deferred", e.target.checked)} size="small" />} label="Pago posterior" />
                          </Grid>
                          {cfg.payment_points && (
                            <>
                              <Grid item xs={12} sm={6}>
                                <TextField label="Puntos por $1 gastado" type="number" size="small" fullWidth
                                  value={cfg.points_per_peso}
                                  onChange={e => updateBranchConfig(branch.id, "points_per_peso", parseFloat(e.target.value) || 1)}
                                  InputProps={{ inputProps: { min: 0.01, step: 0.1 } }}
                                />
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <TextField label="Valor de 1 punto en $" type="number" size="small" fullWidth
                                  value={cfg.peso_per_point}
                                  onChange={e => updateBranchConfig(branch.id, "peso_per_point", parseFloat(e.target.value) || 1)}
                                  InputProps={{ inputProps: { min: 0.01, step: 0.1 } }}
                                />
                              </Grid>
                            </>
                          )}
                        </Grid>

                        <Divider sx={{ mb: 2 }} />

                        {/* Tiempos y Urgencia */}
                        <Typography variant="subtitle2" fontWeight={700} mb={1.5} color="text.secondary">
                          TIEMPOS DE ENTREGA Y URGENCIA
                        </Typography>
                        <Grid container spacing={2} mb={2}>
                          <Grid item xs={12} sm={4}>
                            <TextField label="Normal (días hábiles)" type="number" size="small" fullWidth
                              value={cfg.normal_days}
                              onChange={e => updateBranchConfig(branch.id, "normal_days", parseInt(e.target.value) || 0)}
                              InputProps={{ inputProps: { min: 0 } }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <TextField label="Urgente (días)" type="number" size="small" fullWidth
                              value={cfg.urgent_days}
                              onChange={e => updateBranchConfig(branch.id, "urgent_days", parseInt(e.target.value) || 0)}
                              InputProps={{ inputProps: { min: 0 } }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <TextField label="Extra urgente (días, 0=mismo día)" type="number" size="small" fullWidth
                              value={cfg.extra_urgent_days}
                              onChange={e => updateBranchConfig(branch.id, "extra_urgent_days", parseInt(e.target.value) || 0)}
                              InputProps={{ inputProps: { min: 0 } }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField label="% incremento Urgente" type="number" size="small" fullWidth
                              value={cfg.urgent_pct}
                              onChange={e => updateBranchConfig(branch.id, "urgent_pct", parseFloat(e.target.value) || 0)}
                              InputProps={{ endAdornment: <InputAdornment position="end"><PercentIcon fontSize="small" /></InputAdornment>, inputProps: { min: 0 } }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField label="% incremento Extra urgente" type="number" size="small" fullWidth
                              value={cfg.extra_urgent_pct}
                              onChange={e => updateBranchConfig(branch.id, "extra_urgent_pct", parseFloat(e.target.value) || 0)}
                              InputProps={{ endAdornment: <InputAdornment position="end"><PercentIcon fontSize="small" /></InputAdornment>, inputProps: { min: 0 } }}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField label="Formato del carrusel (ejemplo orientativo)" fullWidth size="small"
                              value={cfg.carousel_format_hint}
                              onChange={e => updateBranchConfig(branch.id, "carousel_format_hint", e.target.value)}
                              placeholder="Ej. A-01, 105, B-07..."
                              helperText="Muestra el formato esperado al asignar posición en Producción"
                            />
                          </Grid>
                        </Grid>

                        <Divider sx={{ mb: 2 }} />

                        {/* Escaneo de prendas */}
                        <Typography variant="subtitle2" fontWeight={700} mb={1.5} color="text.secondary">
                          ESCANEO DE PRENDAS EN PRODUCCIÓN
                        </Typography>
                        <Box sx={{ bgcolor: cfg.require_scan ? "success.50" : "grey.50", borderRadius: 2, p: 2, mb: 2, border: "1px solid", borderColor: cfg.require_scan ? "success.200" : "divider" }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={Boolean(cfg.require_scan)}
                                onChange={e => updateBranchConfig(branch.id, "require_scan", e.target.checked)}
                                color="success"
                              />
                            }
                            label={
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {cfg.require_scan ? "Escaneo requerido (activado)" : "Escaneo desactivado — botón Listo directo"}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {cfg.require_scan
                                    ? "Se deben escanear todas las prendas antes de marcar la orden como Lista."
                                    : "El operador puede marcar la orden como Lista directamente sin escanear tickets."}
                                </Typography>
                              </Box>
                            }
                          />
                        </Box>

                        {/* Botón guardar toda la config */}
                        <Box display="flex" alignItems="center" gap={2}>
                          <Button
                            variant="contained"
                            size="large"
                            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                            onClick={() => handleSaveBranchConfig(branch.id)}
                            disabled={saving}
                            sx={{ px: 4 }}
                          >
                            Guardar configuración de {branch.name}
                          </Button>
                        </Box>
                        {msg && <Alert severity={msg.type} sx={{ mt: 1.5 }}>{msg.text}</Alert>}
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>
              );
            })
          )}
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
              {pwSaving ? <CircularProgress size={18} color="inherit" /> : "Actualizar"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
