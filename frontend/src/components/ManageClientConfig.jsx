import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Paper, Typography, Button, TextField, IconButton, Chip,
  Stack, Divider, Alert, CircularProgress, MenuItem, Switch, FormControlLabel,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import PaletteIcon from "@mui/icons-material/Palette";

const API = import.meta.env.VITE_API_URL || API;

export default function ManageClientConfig() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");
  const claims = JSON.parse(localStorage.getItem("user_claims") || "{}");

  const [types, setTypes] = useState([]);
  const [newType, setNewType] = useState("");
  const [addingType, setAddingType] = useState(false);
  const [typeMsg, setTypeMsg] = useState(null);

  const [promotions, setPromotions] = useState([]);
  const [promoForm, setPromoForm] = useState({ title: "", description: "", discount_pct: "", client_type_id: "", active: true });
  const [savingPromo, setSavingPromo] = useState(false);
  const [promoMsg, setPromoMsg] = useState(null);

  const [branding, setBranding] = useState({
    portal_primary_color: "#1976d2",
    portal_bg_color: "#f5f5f5",
    portal_slogan: "",
    portal_logo_url: "",
  });
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingLogoFile, setBrandingLogoFile] = useState(null);
  const [brandingMsg, setBrandingMsg] = useState(null);

  useEffect(() => {
    loadTypes();
    loadPromos();
    loadBranding();
  }, []);

  const loadBranding = () => {
    fetch(`${API}/businesses/${claims.business_id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setBranding({
        portal_primary_color: d.portal_primary_color || "#1976d2",
        portal_bg_color: d.portal_bg_color || "#f5f5f5",
        portal_slogan: d.portal_slogan || "",
        portal_logo_url: d.portal_logo_url || "",
      }))
      .catch(() => {});
  };

  const handleSaveBranding = async () => {
    setSavingBranding(true);
    setBrandingMsg(null);
    try {
      // 1. Si hay archivo de logo nuevo, súbelo primero via multipart
      if (brandingLogoFile) {
        const form = new FormData();
        form.append("logo", brandingLogoFile);
        const logoRes = await fetch(`${API}/businesses/${claims.business_id}/upload-logo`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        if (!logoRes.ok) {
          const err = await logoRes.json();
          setBrandingMsg({ type: "error", text: err.message || "Error al subir logo" });
          setSavingBranding(false);
          return;
        }
        setBrandingLogoFile(null);
      }
      // 2. Guarda colores y slogan (sin logo — ya guardado arriba)
      const payload = {
        portal_primary_color: branding.portal_primary_color,
        portal_bg_color: branding.portal_bg_color,
        portal_slogan: branding.portal_slogan,
      };
      const res = await fetch(`${API}/businesses/${claims.business_id}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) setBrandingMsg({ type: "success", text: "Branding guardado correctamente" });
      else setBrandingMsg({ type: "error", text: "Error al guardar colores" });
    } catch { setBrandingMsg({ type: "error", text: "Error de conexión" }); }
    finally { setSavingBranding(false); }
  };

  const loadTypes = () => {
    fetch(`${API}/api/v1/client-types`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setTypes(d.client_types || [])).catch(() => {});
  };

  const loadPromos = () => {
    fetch(`${API}/api/v1/promotions`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setPromotions(d.promotions || [])).catch(() => {});
  };

  const handleAddType = async () => {
    if (!newType.trim()) return;
    setAddingType(true);
    setTypeMsg(null);
    try {
      const res = await fetch(`${API}/api/v1/client-types`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newType }),
      });
      const d = await res.json();
      if (res.ok) { setNewType(""); loadTypes(); setTypeMsg({ type: "success", text: "Tipo agregado" }); }
      else setTypeMsg({ type: "error", text: d.message || "Error" });
    } catch { setTypeMsg({ type: "error", text: "Error de conexión" }); }
    finally { setAddingType(false); }
  };

  const handleDeleteType = async (id) => {
    await fetch(`${API}/api/v1/client-types/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    loadTypes();
  };

  const handleAddPromo = async () => {
    if (!promoForm.title.trim()) { setPromoMsg({ type: "error", text: "El título es requerido" }); return; }
    setSavingPromo(true);
    setPromoMsg(null);
    try {
      const body = { ...promoForm };
      if (!body.client_type_id) delete body.client_type_id;
      if (!body.discount_pct) delete body.discount_pct;
      else body.discount_pct = parseFloat(body.discount_pct);
      const res = await fetch(`${API}/api/v1/promotions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (res.ok) {
        setPromoForm({ title: "", description: "", discount_pct: "", client_type_id: "", active: true });
        loadPromos();
        setPromoMsg({ type: "success", text: "Promoción creada" });
      } else setPromoMsg({ type: "error", text: d.message || "Error" });
    } catch { setPromoMsg({ type: "error", text: "Error de conexión" }); }
    finally { setSavingPromo(false); }
  };

  const handleTogglePromo = async (promo) => {
    await fetch(`${API}/api/v1/promotions/${promo.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ active: !promo.active }),
    });
    loadPromos();
  };

  const handleDeletePromo = async (id) => {
    await fetch(`${API}/api/v1/promotions/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    loadPromos();
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", p: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 800, mx: "auto" }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/business-admin-dashboard")} sx={{ mb: 2 }}>
          Regresar al Dashboard
        </Button>

        {/* TIPOS DE CLIENTE */}
        <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={700} mb={0.5}>Tipos de Cliente</Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Define los tipos o niveles que tendrán tus clientes (ej. Regular, VIP, Preferente).
          </Typography>

          <Box display="flex" gap={1} mb={2}>
            <TextField size="small" label="Nuevo tipo" value={newType}
              onChange={e => setNewType(e.target.value.replace(/\b\w/g, c => c.toUpperCase()))}
              onKeyDown={e => e.key === "Enter" && handleAddType()}
              sx={{ flex: 1 }} inputProps={{ maxLength: 60 }} />
            <Button variant="contained" startIcon={addingType ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}
              onClick={handleAddType} disabled={addingType || !newType.trim()}>
              Agregar
            </Button>
          </Box>

          {typeMsg && <Alert severity={typeMsg.type} sx={{ mb: 1, py: 0.2 }}>{typeMsg.text}</Alert>}

          <Box display="flex" flexWrap="wrap" gap={1}>
            {types.length === 0 && <Typography variant="body2" color="text.secondary">Sin tipos definidos.</Typography>}
            {types.map(t => (
              <Chip key={t.id} label={t.name}
                onDelete={() => handleDeleteType(t.id)}
                color="primary" variant="outlined" />
            ))}
          </Box>
        </Paper>

        {/* BRANDING DEL PORTAL */}
        <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mt: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <PaletteIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>Portal del Cliente — Personalización</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Personaliza cómo ven tu negocio los clientes cuando ingresan a su portal.
          </Typography>

          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Logo del negocio
              </Typography>
              <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                <Button variant="outlined" component="label" size="small" startIcon={<PaletteIcon />}>
                  Subir imagen
                  <input type="file" hidden accept="image/*" onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      alert("La imagen debe ser menor a 2 MB");
                      return;
                    }
                    setBrandingLogoFile(file);
                    const reader = new FileReader();
                    reader.onload = ev => setBranding(p => ({ ...p, portal_logo_url: ev.target.result }));
                    reader.readAsDataURL(file);
                  }} />
                </Button>
                {branding.portal_logo_url && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box component="img" src={branding.portal_logo_url} alt="logo preview"
                      sx={{ height: 40, maxWidth: 120, objectFit: "contain", border: "1px solid #ddd", borderRadius: 1, p: 0.5 }} />
                    <Button size="small" color="error" onClick={() => setBranding(p => ({ ...p, portal_logo_url: "" }))}>
                      Quitar
                    </Button>
                  </Box>
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                PNG, JPG o SVG — máx. 500 KB
              </Typography>
            </Box>
            <TextField
              label="Slogan o mensaje de bienvenida"
              fullWidth size="small"
              value={branding.portal_slogan}
              onChange={e => setBranding(p => ({ ...p, portal_slogan: e.target.value.replace(/^\w/, c => c.toUpperCase()) }))}
              placeholder="Bienvenido a tu tintorería de confianza"
              inputProps={{ maxLength: 200 }}
            />
            <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
              <Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Color primario</Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <input type="color" value={branding.portal_primary_color}
                    onChange={e => setBranding(p => ({ ...p, portal_primary_color: e.target.value }))}
                    style={{ width: 48, height: 36, border: "none", cursor: "pointer", borderRadius: 4 }} />
                  <Typography variant="body2" fontFamily="monospace">{branding.portal_primary_color}</Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Color de fondo</Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <input type="color" value={branding.portal_bg_color}
                    onChange={e => setBranding(p => ({ ...p, portal_bg_color: e.target.value }))}
                    style={{ width: 48, height: 36, border: "none", cursor: "pointer", borderRadius: 4 }} />
                  <Typography variant="body2" fontFamily="monospace">{branding.portal_bg_color}</Typography>
                </Box>
              </Box>
              {/* Preview */}
              <Box flex={1} minWidth={200}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Vista previa</Typography>
                <Box sx={{ bgcolor: branding.portal_bg_color, borderRadius: 2, p: 1.5, border: "1px solid #ddd" }}>
                  {branding.portal_logo_url && (
                    <Box component="img" src={branding.portal_logo_url} alt="logo"
                      sx={{ height: 32, mb: 0.5, display: "block", objectFit: "contain" }} />
                  )}
                  <Typography variant="subtitle2" sx={{ color: branding.portal_primary_color, fontWeight: 700 }}>
                    {branding.portal_slogan || "Tu tintorería de confianza"}
                  </Typography>
                  <Button size="small" variant="contained"
                    sx={{ mt: 1, bgcolor: branding.portal_primary_color, fontSize: "10px",
                      "&:hover": { bgcolor: branding.portal_primary_color, filter: "brightness(0.85)" } }}>
                    Ver mis órdenes
                  </Button>
                </Box>
              </Box>
            </Box>
          </Stack>

          {brandingMsg && <Alert severity={brandingMsg.type} sx={{ mt: 2 }}>{brandingMsg.text}</Alert>}

          <Button variant="contained" startIcon={savingBranding ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
            onClick={handleSaveBranding} disabled={savingBranding} sx={{ mt: 2 }}>
            Guardar Branding
          </Button>
        </Paper>
      </Box>
    </Box>
  );
}
