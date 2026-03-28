import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Paper, Typography, Button, TextField, IconButton, Chip,
  Stack, Divider, Alert, CircularProgress, MenuItem, Switch,
  FormControlLabel, Grid, Collapse, Tabs, Tab, Tooltip,
  ToggleButtonGroup, ToggleButton, Dialog, DialogTitle,
  DialogContent, DialogActions,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EmailIcon from "@mui/icons-material/Email";
import EditIcon from "@mui/icons-material/Edit";
import CampaignIcon from "@mui/icons-material/Campaign";
import BlockIcon from "@mui/icons-material/Block";

const API = import.meta.env.VITE_API_URL || "";

const TRIGGER_META = {
  client_welcome:   { label: "Bienvenida al cliente nuevo",          icon: "👋", hint: "Se envía cuando se registra un cliente nuevo." },
  client_recurring: { label: "Felicitación cliente recurrente",      icon: "⭐", hint: "Se envía cuando el cliente completa su 3ª orden." },
  order_ready:      { label: "Orden lista para recoger",             icon: "✅", hint: "Se envía cuando una orden cambia a estatus 'Listo'." },
};

const DEFAULT_WA = {
  client_welcome:   "¡Hola {nombre}! Bienvenido/a. Accede a tu portal: {portal}\nUsuario: {usuario}\nContraseña temporal: {contrasena} 🧺",
  client_recurring: "¡Hola {nombre}! Ya eres parte de nuestros clientes frecuentes. ¡Gracias por confiar en nosotros! ⭐",
  order_ready:      "¡Hola {nombre}! Tu orden #{folio} ya está lista para recoger. ¡Te esperamos! ✅",
};
const DEFAULT_EMAIL_SUBJECT = {
  client_welcome:   "¡Bienvenido/a a nuestra tintorería!",
  client_recurring: "¡Gracias por ser cliente frecuente!",
  order_ready:      "Tu orden está lista para recoger",
};
const DEFAULT_EMAIL_BODY = {
  client_welcome:   "Hola {nombre},\n\nBienvenido/a. Ya puedes acceder a tu portal:\n{portal}\n\nUsuario: {usuario}\nContraseña temporal: {contrasena}\n\n¡Hasta pronto!",
  client_recurring: "Hola {nombre},\n\n¡Ya eres cliente frecuente! ¡Gracias por tu confianza!\n\n¡Hasta pronto!",
  order_ready:      "Hola {nombre},\n\nTu orden #{folio} ya está lista para recoger. ¡Te esperamos!\n\n¡Hasta pronto!",
};

const EMPTY_FORM = {
  title: "", description: "", promo_type: "bundle_price",
  service_id: "", bundle_price: "", discount_pct: "",
  client_type_id: "", branch_id: "", starts_at: "", ends_at: "", active: true,
  required_lines: [], reward_lines: [],
};

const EMPTY_CAMPAIGN = {
  name: "", campaign_type: "birthday", channel: "whatsapp",
  subject: "", message_body: "", send_date: "", image_base64: "",
};

export default function ManagePromotions() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");
  const claims = JSON.parse(localStorage.getItem("user_claims") || "{}");

  const [tab, setTab] = useState(0);

  // â”€â”€ Promotions state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [promotions, setPromotions] = useState([]);
  const [services, setServices] = useState([]);
  const [clientTypes, setClientTypes] = useState([]);
  const [branches, setBranches] = useState([]);
  const [lineOptions, setLineOptions] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [rewardLineOptions, setRewardLineOptions] = useState([]);

  // â”€â”€ Messages state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [waTemplates, setWaTemplates]       = useState({});
  const [emailTemplates, setEmailTemplates] = useState({});
  const [channelConfig, setChannelConfig]   = useState({});  // { trigger: 'whatsapp'|'email'|'none' }
  const [editingTrigger, setEditingTrigger] = useState(null);
  const [editWaText, setEditWaText]         = useState("");
  const [editEmailSubject, setEditEmailSubject] = useState("");
  const [editEmailBody, setEditEmailBody]   = useState("");
  const [msgState, setMsgState]             = useState(null);
  const [savingMsg, setSavingMsg]           = useState(false);

  // â”€â”€ Date campaigns state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [campaigns, setCampaigns]       = useState([]);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [campaignForm, setCampaignForm] = useState(EMPTY_CAMPAIGN);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [campaignMsg, setCampaignMsg]   = useState(null);

  // â”€â”€ Load all â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    loadAll();
    loadMessageData();
    loadCampaigns();
    fetch(`${API}/services`,                                         { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => setServices(Array.isArray(d) ? d : (d.services || []))).catch(() => {});
    fetch(`${API}/api/v1/client-types`,                              { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => setClientTypes(d.client_types || [])).catch(() => {});
    fetch(`${API}/businesses/${claims.business_id}/branches`,        { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => setBranches(d.branches || [])).catch(() => {});
  }, []);

  const loadAll = () =>
    fetch(`${API}/api/v1/promotions`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setPromotions(d.promotions || [])).catch(() => {});

  const loadMessageData = () => {
    fetch(`${API}/api/v1/whatsapp-templates`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) { const m = {}; d.forEach(t => { m[t.trigger_type] = t; }); setWaTemplates(m); } }).catch(() => {});
    fetch(`${API}/api/v1/email-templates`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) { const m = {}; d.forEach(t => { m[t.trigger_type] = t; }); setEmailTemplates(m); } }).catch(() => {});
    fetch(`${API}/api/v1/trigger-channel-config`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d && typeof d === "object") setChannelConfig(d); }).catch(() => {});
  };

  const loadCampaigns = () =>
    fetch(`${API}/api/v1/date-campaigns`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setCampaigns(Array.isArray(d) ? d : [])).catch(() => {});

  // â”€â”€ Channel selector â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleChannelChange = async (trigger, newChannel) => {
    if (!newChannel) return;
    setChannelConfig(prev => ({ ...prev, [trigger]: newChannel }));
    await fetch(`${API}/api/v1/trigger-channel-config`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ trigger_type: trigger, channel: newChannel }),
    }).catch(() => {});
  };

  // â”€â”€ Save message templates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSaveMessage = async (trigger) => {
    setSavingMsg(true);
    setMsgState(null);
    const channel = channelConfig[trigger] || "none";
    try {
      if (channel === "whatsapp" || channel === "none") {
        const body = editWaText.trim() || DEFAULT_WA[trigger];
        const existing = waTemplates[trigger];
        await fetch(
          existing ? `${API}/api/v1/whatsapp-templates/${existing.id}` : `${API}/api/v1/whatsapp-templates`,
          {
            method: existing ? "PUT" : "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(existing ? { message_body: body } : { trigger_type: trigger, message_body: body }),
          }
        );
      }
      if (channel === "email") {
        const subject = editEmailSubject.trim() || DEFAULT_EMAIL_SUBJECT[trigger];
        const body    = editEmailBody.trim()    || DEFAULT_EMAIL_BODY[trigger];
        const existing = emailTemplates[trigger];
        await fetch(
          existing ? `${API}/api/v1/email-templates/${existing.id}` : `${API}/api/v1/email-templates`,
          {
            method: existing ? "PUT" : "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(existing ? { subject, message_body: body } : { trigger_type: trigger, subject, message_body: body }),
          }
        );
      }
      setMsgState({ type: "success", text: "Guardado correctamente" });
      setEditingTrigger(null);
      loadMessageData();
    } catch {
      setMsgState({ type: "error", text: "Error al guardar" });
    }
    setSavingMsg(false);
  };

  const openEdit = (trigger) => {
    const ch = channelConfig[trigger] || "none";
    setEditWaText(waTemplates[trigger]?.message_body || DEFAULT_WA[trigger]);
    setEditEmailSubject(emailTemplates[trigger]?.subject || DEFAULT_EMAIL_SUBJECT[trigger]);
    setEditEmailBody(emailTemplates[trigger]?.message_body || DEFAULT_EMAIL_BODY[trigger]);
    setEditingTrigger(trigger);
    setMsgState(null);
  };

  // â”€â”€ Date campaigns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSaveCampaign = async () => {
    if (!campaignForm.name.trim() || !campaignForm.message_body.trim()) {
      setCampaignMsg({ type: "error", text: "Nombre y mensaje son requeridos" }); return;
    }
    if (campaignForm.campaign_type === "one_time" && !campaignForm.send_date) {
      setCampaignMsg({ type: "error", text: "La fecha de envío es requerida" }); return;
    }
    setSavingCampaign(true);
    const r = await fetch(`${API}/api/v1/date-campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(campaignForm),
    }).catch(() => null);
    setSavingCampaign(false);
    if (r?.ok) {
      setCampaignForm(EMPTY_CAMPAIGN);
      setShowCampaignForm(false);
      loadCampaigns();
      setCampaignMsg({ type: "success", text: "Campaña creada" });
    } else {
      setCampaignMsg({ type: "error", text: "Error al crear la campaña" });
    }
  };

  const handleDeleteCampaign = async (id) => {
    await fetch(`${API}/api/v1/date-campaigns/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    loadCampaigns();
  };

  // â”€â”€ Promotions helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const setField = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const getServiceCats = () => services.find(s => s.id === parseInt(form.service_id))?._cats || [];

  const handleServiceChange = (serviceId) => {
    setField("service_id", serviceId);
    setField("required_lines", []);
    setField("reward_lines", []);
    setLineOptions([]);
    setRewardLineOptions([]);
    if (!serviceId) return;
    fetch(`${API}/services/${serviceId}/categories`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { const cats = Array.isArray(d) ? d : (d.categories || []); setServices(prev => prev.map(s => s.id === parseInt(serviceId) ? { ...s, _cats: cats } : s)); }).catch(() => {});
  };

  const addRequiredLine = () => { setForm(p => ({ ...p, required_lines: [...p.required_lines, { item_id: "", category_id: "", quantity: 1 }] })); setLineOptions(prev => [...prev, { categories: getServiceCats(), items: [], selectedCategory: "" }]); };
  const setRequiredLine = (i, key, val) => setForm(p => { const lines = [...p.required_lines]; lines[i] = { ...lines[i], [key]: val }; return { ...p, required_lines: lines }; });
  const handleRequiredCategoryChange = (i, catId) => { setRequiredLine(i, "category_id", catId); setRequiredLine(i, "item_id", ""); setLineOptions(prev => { const u = [...prev]; u[i] = { ...u[i], selectedCategory: catId, items: [] }; return u; }); if (!catId) return; fetch(`${API}/categories/${catId}/items`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => { const its = Array.isArray(d) ? d : (d.items || []); setLineOptions(prev => { const u = [...prev]; u[i] = { ...u[i], items: its }; return u; }); }).catch(() => {}); };
  const removeRequiredLine = (i) => { setForm(p => ({ ...p, required_lines: p.required_lines.filter((_, idx) => idx !== i) })); setLineOptions(prev => prev.filter((_, idx) => idx !== i)); };

  const addRewardLine = () => { setForm(p => ({ ...p, reward_lines: [...p.reward_lines, { item_id: "", category_id: "", quantity: 1 }] })); setRewardLineOptions(prev => [...prev, { categories: getServiceCats(), items: [], selectedCategory: "" }]); };
  const setRewardLine = (i, key, val) => setForm(p => { const lines = [...p.reward_lines]; lines[i] = { ...lines[i], [key]: val }; return { ...p, reward_lines: lines }; });
  const handleRewardCategoryChange = (i, catId) => { setRewardLine(i, "category_id", catId); setRewardLine(i, "item_id", ""); setRewardLineOptions(prev => { const u = [...prev]; u[i] = { ...u[i], selectedCategory: catId, items: [] }; return u; }); if (!catId) return; fetch(`${API}/categories/${catId}/items`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => { const its = Array.isArray(d) ? d : (d.items || []); setRewardLineOptions(prev => { const u = [...prev]; u[i] = { ...u[i], items: its }; return u; }); }).catch(() => {}); };
  const removeRewardLine = (i) => { setForm(p => ({ ...p, reward_lines: p.reward_lines.filter((_, idx) => idx !== i) })); setRewardLineOptions(prev => prev.filter((_, idx) => idx !== i)); };

  const handleSave = async () => {
    if (!form.title.trim()) { setMsg({ type: "error", text: "El título es requerido" }); return; }
    if (!form.starts_at || !form.ends_at) { setMsg({ type: "error", text: "Fechas de vigencia requeridas" }); return; }
    if (form.required_lines.length === 0) { setMsg({ type: "error", text: "Agrega al menos un item requerido" }); return; }
    setSaving(true); setMsg(null);
    try {
      const body = { ...form, service_id: form.service_id || null, client_type_id: form.client_type_id || null, bundle_price: form.bundle_price ? parseFloat(form.bundle_price) : null, discount_pct: form.discount_pct ? parseFloat(form.discount_pct) : null, required_lines: form.required_lines.map(l => ({ item_id: l.item_id || null, quantity: parseInt(l.quantity) })), reward_lines: form.reward_lines.map(l => ({ item_id: l.item_id, quantity: parseInt(l.quantity) })) };
      const res = await fetch(`${API}/api/v1/promotions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      const d = await res.json();
      if (res.ok) { setForm(EMPTY_FORM); setShowForm(false); loadAll(); setMsg({ type: "success", text: "Promoción creada" }); }
      else setMsg({ type: "error", text: d.message || "Error" });
    } catch { setMsg({ type: "error", text: "Error de conexión" }); }
    finally { setSaving(false); }
  };

  const handleToggle = async (promo) => { await fetch(`${API}/api/v1/promotions/${promo.id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ active: !promo.active }) }); loadAll(); };
  const handleDelete = async (id) => { if (!window.confirm("¿Eliminar esta promoción?")) return; await fetch(`${API}/api/v1/promotions/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }); loadAll(); };

  const today = new Date().toISOString().slice(0, 10);

  const CHANNEL_ICON = { whatsapp: <WhatsAppIcon sx={{ fontSize: 16, color: "#25D366" }} />, email: <EmailIcon sx={{ fontSize: 16, color: "#4361ee" }} />, none: <BlockIcon sx={{ fontSize: 16, color: "#9ca3af" }} /> };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", p: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 880, mx: "auto" }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/business-admin-dashboard")} sx={{ mb: 2 }}>Regresar</Button>
        <Typography variant="h5" fontWeight={700} mb={2}>Promociones y Mensajes</Typography>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }} variant="fullWidth">
          <Tab label="Promociones" />
          <Tab label={<Box display="flex" alignItems="center" gap={0.5}><WhatsAppIcon fontSize="small" sx={{ color: "#25D366" }} /> Mensajes Automáticos</Box>} />
          <Tab label={<Box display="flex" alignItems="center" gap={0.5}><CampaignIcon fontSize="small" color="primary" /> Campañas por Fecha</Box>} />
        </Tabs>

        {/* â”€â”€â”€ TAB 1: MENSAJES AUTOMÃTICOS â”€â”€â”€ */}
        {tab === 1 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              Por cada trigger elige <strong>un solo canal</strong>: WhatsApp, Email o Ninguno. Solo el canal seleccionado se enviará.
              Usa <strong>{"{nombre}"}</strong> · <strong>{"{folio}"}</strong> · <strong>{"{usuario}"}</strong> · <strong>{"{contrasena}"}</strong> · <strong>{"{portal}"}</strong> en el texto.
            </Alert>
            {msgState && <Alert severity={msgState.type} sx={{ mb: 2 }} onClose={() => setMsgState(null)}>{msgState.text}</Alert>}
            <Stack spacing={2}>
              {Object.entries(TRIGGER_META).map(([trigger, meta]) => {
                const channel = channelConfig[trigger] || "none";
                const isEditing = editingTrigger === trigger;
                return (
                  <Paper key={trigger} elevation={2} sx={{ p: 3, borderRadius: 3 }}>
                    {/* Header */}
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                      <Box>
                        <Typography fontWeight={700} fontSize={16}>{meta.icon} {meta.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{meta.hint}</Typography>
                      </Box>
                      <IconButton size="small" onClick={() => isEditing ? setEditingTrigger(null) : openEdit(trigger)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    {/* Channel selector */}
                    <Box mt={1.5} mb={1}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.5}>CANAL DE ENVÍO</Typography>
                      <ToggleButtonGroup value={channel} exclusive size="small"
                        onChange={(_, v) => handleChannelChange(trigger, v)}
                        sx={{ "& .MuiToggleButton-root": { px: 2, py: 0.5, fontSize: 12, textTransform: "none" } }}>
                        <ToggleButton value="whatsapp" sx={{ gap: 0.5, "&.Mui-selected": { bgcolor: "#dcfce7", color: "#16a34a", borderColor: "#86efac" } }}>
                          <WhatsAppIcon sx={{ fontSize: 14 }} /> WhatsApp
                        </ToggleButton>
                        <ToggleButton value="email" sx={{ gap: 0.5, "&.Mui-selected": { bgcolor: "#eff6ff", color: "#2563eb", borderColor: "#93c5fd" } }}>
                          <EmailIcon sx={{ fontSize: 14 }} /> Email
                        </ToggleButton>
                        <ToggleButton value="none" sx={{ gap: 0.5, "&.Mui-selected": { bgcolor: "#f9fafb", color: "#9ca3af", borderColor: "#e5e7eb" } }}>
                          <BlockIcon sx={{ fontSize: 14 }} /> Ninguno
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Message preview / edit */}
                    {channel === "none" ? (
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">Este trigger está desactivado — no se enviará ningún mensaje.</Typography>
                    ) : isEditing ? (
                      <Box>
                        {channel === "email" && (
                          <TextField fullWidth size="small" label="Asunto del correo" value={editEmailSubject}
                            onChange={e => setEditEmailSubject(e.target.value)} sx={{ mb: 1.5 }} />
                        )}
                        <TextField fullWidth multiline minRows={3} label={channel === "email" ? "Cuerpo del mensaje" : "Mensaje WhatsApp"}
                          value={channel === "email" ? editEmailBody : editWaText}
                          onChange={e => channel === "email" ? setEditEmailBody(e.target.value) : setEditWaText(e.target.value)}
                          sx={{ mb: 1.5 }} />
                        <Stack direction="row" spacing={1}>
                          <Button variant="contained" startIcon={<SaveIcon />} size="small" disabled={savingMsg}
                            onClick={() => handleSaveMessage(trigger)}
                            sx={{ bgcolor: channel === "whatsapp" ? "#25D366" : "#4361ee", "&:hover": { bgcolor: channel === "whatsapp" ? "#1ebe5c" : "#3251d3" } }}>
                            {savingMsg ? "Guardando…" : "Guardar"}
                          </Button>
                          <Button size="small" onClick={() => setEditingTrigger(null)}>Cancelar</Button>
                        </Stack>
                      </Box>
                    ) : (
                      <Box sx={{ bgcolor: "grey.50", borderRadius: 2, p: 1.5 }}>
                        {channel === "email" && (
                          <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                            <strong>Asunto:</strong> {emailTemplates[trigger]?.subject || DEFAULT_EMAIL_SUBJECT[trigger]}
                          </Typography>
                        )}
                        <Typography variant="body2" color={channel === "whatsapp" ? (waTemplates[trigger] ? "text.primary" : "text.secondary") : (emailTemplates[trigger] ? "text.primary" : "text.secondary")}
                          fontStyle={(channel === "whatsapp" ? !waTemplates[trigger] : !emailTemplates[trigger]) ? "italic" : "normal"}>
                          {channel === "whatsapp"
                            ? (waTemplates[trigger]?.message_body || DEFAULT_WA[trigger])
                            : (emailTemplates[trigger]?.message_body || DEFAULT_EMAIL_BODY[trigger])}
                        </Typography>
                        {((channel === "whatsapp" && !waTemplates[trigger]) || (channel === "email" && !emailTemplates[trigger])) && (
                          <Chip label="Usando mensaje por defecto" size="small" color="warning" variant="outlined" sx={{ mt: 1 }} />
                        )}
                      </Box>
                    )}
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        )}

        {/* â”€â”€â”€ TAB 2: CAMPAÃ‘AS POR FECHA â”€â”€â”€ */}
        {tab === 2 && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box>
                <Typography fontWeight={700} fontSize={15}>Campañas por fecha</Typography>
                <Typography variant="caption" color="text.secondary">
                  Cumpleaños (anual) o fecha específica (única vez). Solo llega a clientes que cumplan la condición.
                </Typography>
              </Box>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowCampaignForm(v => !v)} sx={{ borderRadius: 2 }}>
                {showCampaignForm ? "Cancelar" : "Nueva campaña"}
              </Button>
            </Box>

            {campaignMsg && <Alert severity={campaignMsg.type} sx={{ mb: 2 }} onClose={() => setCampaignMsg(null)}>{campaignMsg.text}</Alert>}

            <Collapse in={showCampaignForm}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Typography fontWeight={700} mb={2}>Nueva campaña</Typography>
                <Grid container spacing={2}>
                  {/* ── Fila 1: 4 columnas ── */}
                  <Grid item xs={12} sm={3}>
                    <TextField fullWidth label="Nombre de la campaña" value={campaignForm.name}
                      onChange={e => setCampaignForm(p => ({ ...p, name: e.target.value }))} required />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField fullWidth select label="Tipo" value={campaignForm.campaign_type}
                      onChange={e => setCampaignForm(p => ({ ...p, campaign_type: e.target.value, send_date: "" }))}>
                      <MenuItem value="birthday">🎂 Cumpleaños (anual)</MenuItem>
                      <MenuItem value="one_time">📅 Fecha específica (única vez)</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField fullWidth select label="Canal" value={campaignForm.channel}
                      onChange={e => setCampaignForm(p => ({ ...p, channel: e.target.value }))}>
                      <MenuItem value="whatsapp"><Box display="flex" alignItems="center" gap={1}><WhatsAppIcon sx={{ fontSize: 16, color: "#25D366" }} /> WhatsApp</Box></MenuItem>
                      <MenuItem value="email"><Box display="flex" alignItems="center" gap={1}><EmailIcon sx={{ fontSize: 16, color: "#4361ee" }} /> Email</Box></MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField fullWidth label="Fecha de envío" type="date" value={campaignForm.send_date}
                      onChange={e => setCampaignForm(p => ({ ...p, send_date: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                      disabled={campaignForm.campaign_type !== "one_time"}
                      required={campaignForm.campaign_type === "one_time"}
                      inputProps={{ min: today }}
                      helperText={campaignForm.campaign_type !== "one_time" ? "Solo para fecha específica" : ""} />
                  </Grid>

                  {/* ── Asunto (email only, full width) ── */}
                  {campaignForm.channel === "email" && (
                    <Grid item xs={12}>
                      <TextField fullWidth label="Asunto del correo" value={campaignForm.subject}
                        onChange={e => setCampaignForm(p => ({ ...p, subject: e.target.value }))} />
                    </Grid>
                  )}

                </Grid>

                {/* ── Fila 2: Imagen sola, ancho completo ── */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1}>
                    IMAGEN ADJUNTA (opcional)
                  </Typography>
                  <Box display="flex" alignItems="flex-start" gap={2} flexWrap="wrap">
                    <Button variant="outlined" component="label" size="small" startIcon={<span>🖼️</span>}
                      sx={{ whiteSpace: "nowrap" }}>
                      {campaignForm.image_base64 ? "Cambiar imagen" : "Subir imagen"}
                      <input type="file" accept="image/*" hidden onChange={e => {
                        const file = e.target.files[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) { alert("La imagen no debe superar 2 MB"); return; }
                        const reader = new FileReader();
                        reader.onload = ev => setCampaignForm(p => ({ ...p, image_base64: ev.target.result }));
                        reader.readAsDataURL(file);
                      }} />
                    </Button>
                    {campaignForm.image_base64 && (
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box component="img" src={campaignForm.image_base64}
                          sx={{ height: 64, width: 64, objectFit: "cover", borderRadius: 2, border: "1px solid #e0e0e0" }} />
                        <IconButton size="small" color="error"
                          onClick={() => setCampaignForm(p => ({ ...p, image_base64: "" }))}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                    {!campaignForm.image_base64 && (
                      <Typography variant="caption" color="text.secondary" sx={{ pt: 1 }}>
                        JPG, PNG o GIF · máx 2 MB
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* ── Fila 3: Mensaje ancho completo ── */}
                <Box sx={{ mt: 2 }}>
                  <TextField fullWidth multiline minRows={4} label="Mensaje" value={campaignForm.message_body}
                    onChange={e => setCampaignForm(p => ({ ...p, message_body: e.target.value }))}
                    helperText="Usa {nombre} para el nombre del cliente" required />
                </Box>
                <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
                  <Button variant="outlined" onClick={() => { setCampaignForm(EMPTY_CAMPAIGN); setShowCampaignForm(false); }}>Cancelar</Button>
                  <Button variant="contained" startIcon={savingCampaign ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                    onClick={handleSaveCampaign} disabled={savingCampaign}>
                    Guardar campaña
                  </Button>
                </Box>
              </Paper>
            </Collapse>

            {campaigns.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
                <Typography color="text.secondary">Sin campañas configuradas. Crea la primera.</Typography>
              </Paper>
            ) : (
              <Stack spacing={2}>
                {campaigns.map(c => (
                  <Paper key={c.id} elevation={2} sx={{ p: 2.5, borderRadius: 3, borderLeft: `4px solid ${c.channel === "whatsapp" ? "#25D366" : "#4361ee"}` }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box flex={1}>
                        <Box display="flex" alignItems="center" gap={1} mb={0.5} flexWrap="wrap">
                          {CHANNEL_ICON[c.channel]}
                          <Typography fontWeight={700}>{c.name}</Typography>
                          <Chip size="small" label={c.campaign_type === "birthday" ? "🎂 Cumpleaños" : "📅 Fecha específica"} variant="outlined" />
                          {c.send_date && <Chip size="small" label={new Date(c.send_date + "T12:00:00").toLocaleDateString("es-MX")} color="primary" variant="outlined" />}
                          {c.fired_at && <Chip size="small" label="â✅ Enviada" color="success" />}
                        </Box>
                        {c.subject && <Typography variant="caption" color="text.secondary" display="block"><strong>Asunto:</strong> {c.subject}</Typography>}
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{c.message_body}</Typography>
                      </Box>
                      <IconButton size="small" color="error" onClick={() => handleDeleteCampaign(c.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>
        )}

        {/* â”€â”€â”€ TAB 0: PROMOCIONES â”€â”€â”€ */}
        {tab === 0 && (
          <Box>
            <Box display="flex" justifyContent="flex-end" mb={2}>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setShowForm(v => !v); setMsg(null); }}>
                {showForm ? "Cancelar" : "Nueva Promoción"}
              </Button>
            </Box>
            {msg && <Alert severity={msg.type} sx={{ mb: 2 }}>{msg.text}</Alert>}
            <Collapse in={showForm}>
              <Paper elevation={3} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight={600} mb={2}>Nueva Promoción</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={8}><TextField fullWidth required label="Nombre de la promoción" value={form.title} onChange={e => setField("title", e.target.value.replace(/\b\w/g, c => c.toUpperCase()))} /></Grid>
                  <Grid item xs={12} sm={4}><TextField fullWidth select label="Tipo de promoción" value={form.promo_type} onChange={e => setField("promo_type", e.target.value)}><MenuItem value="bundle_price">Paquete precio fijo</MenuItem><MenuItem value="buy_get_free">Compra N lleva M gratis</MenuItem></TextField></Grid>
                  <Grid item xs={12}><TextField fullWidth multiline rows={2} label="Descripción (opcional)" value={form.description} onChange={e => setField("description", e.target.value.replace(/^\w/, c => c.toUpperCase()))} /></Grid>
                  <Grid item xs={12} sm={4}><TextField fullWidth select required label="Servicio" value={form.service_id} onChange={e => handleServiceChange(e.target.value)} helperText="La promo solo aplica a este servicio"><MenuItem value="">— Seleccionar —</MenuItem>{services.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}</TextField></Grid>
                  <Grid item xs={12} sm={4}><TextField fullWidth select label="Solo para tipo de cliente" value={form.client_type_id} onChange={e => setField("client_type_id", e.target.value)}><MenuItem value="">Todos los clientes</MenuItem>{clientTypes.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}</TextField></Grid>
                  <Grid item xs={12} sm={4}><TextField fullWidth select label="Sucursal" value={form.branch_id} onChange={e => setField("branch_id", e.target.value)}><MenuItem value="">Todas las sucursales</MenuItem>{branches.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}</TextField></Grid>
                  {form.promo_type === "bundle_price" && <Grid item xs={12} sm={4}><TextField fullWidth label="Precio del paquete ($)" type="number" value={form.bundle_price} onChange={e => setField("bundle_price", e.target.value)} inputProps={{ min: 0, step: 0.01 }} required /></Grid>}
                  <Grid item xs={12} sm={4}><TextField fullWidth label="Fecha inicio" type="date" value={form.starts_at} onChange={e => setField("starts_at", e.target.value)} InputLabelProps={{ shrink: true }} required inputProps={{ min: today }} /></Grid>
                  <Grid item xs={12} sm={4}><TextField fullWidth label="Fecha fin" type="date" value={form.ends_at} onChange={e => setField("ends_at", e.target.value)} InputLabelProps={{ shrink: true }} required inputProps={{ min: form.starts_at || today }} /></Grid>
                  <Grid item xs={12} sm={4}><FormControlLabel control={<Switch checked={form.active} onChange={e => setField("active", e.target.checked)} />} label="Activa al crear" sx={{ mt: 1 }} /></Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}><Typography variant="subtitle1" fontWeight={600}>Items requeridos</Typography><Button size="small" startIcon={<AddIcon />} onClick={addRequiredLine}>Agregar item</Button></Box>
                {form.required_lines.length === 0 && <Alert severity="info" sx={{ mb: 1 }}>Agrega al menos un item requerido</Alert>}
                <Stack spacing={1} mb={2}>
                  {form.required_lines.map((line, i) => (
                    <Box key={i} display="flex" gap={1} alignItems="center" flexWrap="wrap">
                      <TextField select label="Categoría" value={lineOptions[i]?.selectedCategory || ""} onChange={e => handleRequiredCategoryChange(i, e.target.value)} sx={{ flex: 2, minWidth: 130 }} size="small" disabled={!form.service_id}><MenuItem value="">— Seleccionar —</MenuItem>{(lineOptions[i]?.categories || []).map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</TextField>
                      <TextField select label="Artículo" value={line.item_id} onChange={e => setRequiredLine(i, "item_id", e.target.value)} sx={{ flex: 3, minWidth: 130 }} size="small" disabled={!lineOptions[i]?.selectedCategory}><MenuItem value="">— Seleccionar —</MenuItem>{(lineOptions[i]?.items || []).map(it => <MenuItem key={it.id} value={it.id}>{it.name}</MenuItem>)}</TextField>
                      <TextField label="Cant." type="number" value={line.quantity} onChange={e => setRequiredLine(i, "quantity", e.target.value)} inputProps={{ min: 1 }} sx={{ width: 70 }} size="small" />
                      <IconButton size="small" color="error" onClick={() => removeRequiredLine(i)}><DeleteIcon fontSize="small" /></IconButton>
                    </Box>
                  ))}
                </Stack>
                {form.promo_type === "buy_get_free" && (<><Divider sx={{ my: 2 }} /><Box display="flex" justifyContent="space-between" alignItems="center" mb={1}><Typography variant="subtitle1" fontWeight={600}>Items de regalo</Typography><Button size="small" startIcon={<AddIcon />} onClick={addRewardLine}>Agregar regalo</Button></Box><Stack spacing={1} mb={2}>{form.reward_lines.map((line, i) => (<Box key={i} display="flex" gap={1} alignItems="center" flexWrap="wrap"><TextField select label="Categoría" value={rewardLineOptions[i]?.selectedCategory || ""} onChange={e => handleRewardCategoryChange(i, e.target.value)} sx={{ flex: 2, minWidth: 130 }} size="small" disabled={!form.service_id}><MenuItem value="">— Seleccionar —</MenuItem>{(rewardLineOptions[i]?.categories || []).map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</TextField><TextField select label="Artículo gratis" value={line.item_id} onChange={e => setRewardLine(i, "item_id", e.target.value)} sx={{ flex: 3, minWidth: 130 }} size="small" disabled={!rewardLineOptions[i]?.selectedCategory}><MenuItem value="">— Seleccionar —</MenuItem>{(rewardLineOptions[i]?.items || []).map(it => <MenuItem key={it.id} value={it.id}>{it.name}</MenuItem>)}</TextField><TextField label="Cant." type="number" value={line.quantity} onChange={e => setRewardLine(i, "quantity", e.target.value)} inputProps={{ min: 1 }} sx={{ width: 70 }} size="small" /><IconButton size="small" color="error" onClick={() => removeRewardLine(i)}><DeleteIcon fontSize="small" /></IconButton></Box>))}</Stack></>)}
                <Box display="flex" justifyContent="flex-end" gap={2} mt={1}><Button variant="outlined" onClick={() => { setForm(EMPTY_FORM); setShowForm(false); }}>Cancelar</Button><Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />} onClick={handleSave} disabled={saving}>Guardar Promoción</Button></Box>
              </Paper>
            </Collapse>
            {promotions.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: "center", borderRadius: 3 }}><Typography color="text.secondary">Aún no tienes promociones. ¡Crea la primera!</Typography></Paper>
            ) : (
              <Stack spacing={2}>
                {promotions.map(p => { const valid = p.active && new Date() >= new Date(p.starts_at) && new Date() <= new Date(p.ends_at); return (
                  <Paper key={p.id} elevation={2} sx={{ borderRadius: 3, overflow: "hidden", borderLeft: `4px solid ${valid ? "#4caf50" : "#bdbdbd"}` }}>
                    <Box sx={{ p: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                        <Box flex={1}><Box display="flex" alignItems="center" gap={1} mb={0.5} flexWrap="wrap"><Typography variant="subtitle1" fontWeight={700}>{p.title}</Typography><Chip size="small" label={p.promo_type === "bundle_price" ? "Paquete precio fijo" : "Compra N lleva M gratis"} color="primary" variant="outlined" />{p.service_name && <Chip size="small" label={p.service_name} color="secondary" variant="outlined" />}{p.client_type_name && <Chip size="small" label={p.client_type_name} />}<Chip size="small" label={valid ? "Activa" : (p.active ? "Fuera de vigencia" : "Inactiva")} color={valid ? "success" : "default"} /></Box>{p.description && <Typography variant="body2" color="text.secondary">{p.description}</Typography>}<Typography variant="caption" color="text.secondary">Vigencia: {p.starts_at ? new Date(p.starts_at).toLocaleDateString("es-MX") : "—"} â†’ {p.ends_at ? new Date(p.ends_at).toLocaleDateString("es-MX") : "—"}{p.bundle_price ? ` Â· Precio paquete: $${p.bundle_price.toFixed(2)}` : ""}</Typography></Box>
                        <Box display="flex" gap={0.5} alignItems="center"><Button size="small" onClick={() => handleToggle(p)}>{p.active ? "Desactivar" : "Activar"}</Button><IconButton size="small" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>{expanded === p.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton><IconButton size="small" color="error" onClick={() => handleDelete(p.id)}><DeleteIcon fontSize="small" /></IconButton></Box>
                      </Box>
                    </Box>
                    <Collapse in={expanded === p.id}><Divider /><Box sx={{ p: 2, bgcolor: "action.hover" }}><Typography variant="caption" fontWeight={700} display="block" mb={0.5}>Items requeridos:</Typography>{(p.required_lines || []).map((l, i) => (<Typography key={i} variant="body2">• {l.item_name || "Cualquier item"} × {l.quantity}</Typography>))}{p.promo_type === "buy_get_free" && (p.reward_lines || []).length > 0 && (<><Typography variant="caption" fontWeight={700} display="block" mt={1} mb={0.5}>Items de regalo:</Typography>{p.reward_lines.map((l, i) => (<Typography key={i} variant="body2" color="success.main">🎁 {l.item_name} × {l.quantity} gratis</Typography>))}</>)}</Box></Collapse>
                  </Paper>
                ); })}
              </Stack>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
