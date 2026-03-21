import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Paper, Typography, Button, TextField, IconButton, Chip,
  Stack, Divider, Alert, CircularProgress, MenuItem, Switch,
  FormControlLabel, Grid, Collapse, Tabs, Tab, Tooltip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EditIcon from "@mui/icons-material/Edit";

const API = import.meta.env.VITE_API_URL || API;

const EMPTY_FORM = {
  title: "", description: "", promo_type: "bundle_price",
  service_id: "", bundle_price: "", discount_pct: "",
  client_type_id: "", branch_id: "", starts_at: "", ends_at: "", active: true,
  required_lines: [], reward_lines: [],
};

export default function ManagePromotions() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");
  const claims = JSON.parse(localStorage.getItem("user_claims") || "{}");

  const [tab, setTab] = useState(0);
  const [promotions, setPromotions] = useState([]);
  const [services, setServices] = useState([]);
  const [clientTypes, setClientTypes] = useState([]);
  const [branches, setBranches] = useState([]);
  // Para cada línea requerida: { categories: [], items: [], selectedCategory: "" }
  const [lineOptions, setLineOptions] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  // Para líneas de regalo: misma lógica pero separada
  const [rewardCategories, setRewardCategories] = useState([]);
  const [rewardItems, setRewardItems] = useState([]);
  const [rewardLineOptions, setRewardLineOptions] = useState([]);

  // WhatsApp templates
  const TRIGGER_META = {
    client_welcome:   { label: "Bienvenida al cliente nuevo", icon: "👋", hint: "Se envía cuando se registra un cliente nuevo." },
    client_recurring: { label: "Felicitación cliente recurrente", icon: "⭐", hint: "Se envía cuando el cliente completa su 3ª orden." },
    order_ready:      { label: "Orden lista para recoger", icon: "✅", hint: "Se envía cuando una orden cambia a estatus 'Listo'." },
  };
  const DEFAULT_MESSAGES = {
    client_welcome:   "¡Hola {nombre}! Bienvenido/a a nuestra tintorería. Nos da mucho gusto tenerte como cliente. 🧺",
    client_recurring: "¡Hola {nombre}! Ya eres parte de nuestros clientes frecuentes. ¡Gracias por confiar en nosotros! ⭐",
    order_ready:      "¡Hola {nombre}! Tu orden #{folio} ya está lista para recoger. ¡Te esperamos! ✅",
  };
  const [templates, setTemplates] = useState({});
  const [editingTrigger, setEditingTrigger] = useState(null);
  const [editText, setEditText] = useState("");
  const [waMsgState, setWaMsgState] = useState(null);
  const [waSaving, setWaSaving] = useState(false);

  const loadTemplates = () => {
    fetch(`${API}/api/v1/whatsapp-templates`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          const map = {};
          d.forEach(t => { map[t.trigger_type] = t; });
          setTemplates(map);
        }
      })
      .catch(() => {});
  };

  const handleSaveTemplate = async (trigger_type) => {
    setWaSaving(true);
    setWaMsgState(null);
    try {
      const body = editText.trim() || DEFAULT_MESSAGES[trigger_type];
      const existing = templates[trigger_type];
      const method = existing ? 'PUT' : 'POST';
      const url = existing
        ? `${API}/api/v1/whatsapp-templates/${existing.id}`
        : `${API}/api/v1/whatsapp-templates`;
      const payload = existing
        ? { message_body: body, is_active: existing.is_active }
        : { trigger_type, message_body: body };
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        const saved = await r.json();
        setTemplates(prev => ({ ...prev, [trigger_type]: saved }));
        setWaMsgState({ type: 'success', text: 'Guardado correctamente' });
        setEditingTrigger(null);
      } else {
        setWaMsgState({ type: 'error', text: 'Error al guardar' });
      }
    } catch {
      setWaMsgState({ type: 'error', text: 'Error de conexión' });
    }
    setWaSaving(false);
  };

  const handleToggleTemplate = async (trigger_type) => {
    const t = templates[trigger_type];
    if (!t) return;
    const r = await fetch(`${API}/api/v1/whatsapp-templates/${t.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_active: !t.is_active }),
    });
    if (r.ok) {
      const saved = await r.json();
      setTemplates(prev => ({ ...prev, [trigger_type]: saved }));
    }
  };

  useEffect(() => {
    loadAll();
    loadTemplates();
    fetch(`${API}/services`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setServices(Array.isArray(d) ? d : (d.services || []))).catch(() => {});
    fetch(`${API}/api/v1/client-types`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setClientTypes(d.client_types || [])).catch(() => {});
    fetch(`${API}/businesses/${claims.business_id}/branches`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setBranches(d.branches || [])).catch(() => {});
  }, []);

  // Cuando cambia el servicio seleccionado, resetea líneas y carga categorías para ese servicio
  const handleServiceChange = (serviceId) => {
    setField("service_id", serviceId);
    setField("required_lines", []);
    setField("reward_lines", []);
    setLineOptions([]);
    setRewardLineOptions([]);
    if (!serviceId) return;
    fetch(`${API}/services/${serviceId}/categories`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const cats = Array.isArray(d) ? d : (d.categories || []);
        // Guardamos categorías disponibles para todas las líneas de este servicio
        setLineOptions(prev => prev.map(lo => ({ ...lo, categories: cats })));
        setRewardLineOptions(prev => prev.map(lo => ({ ...lo, categories: cats })));
        // Guardamos globalmente para nuevas líneas
        setLineOptions([]);
        setRewardLineOptions([]);
        // Usamos ref-like: store en estado con key "baseCategories"
        setServices(prev => prev.map(s => s.id === parseInt(serviceId) ? { ...s, _cats: cats } : s));
      })
      .catch(() => {});
  };

  const loadAll = () => {
    fetch(`${API}/api/v1/promotions`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setPromotions(d.promotions || [])).catch(() => {});
  };

  const setField = (key, val) => setForm(p => ({ ...p, [key]: val }));

  // Categorías del servicio seleccionado actualmente
  const getServiceCats = () => {
    const svc = services.find(s => s.id === parseInt(form.service_id));
    return svc?._cats || [];
  };

  const addRequiredLine = () => {
    setForm(p => ({ ...p, required_lines: [...p.required_lines, { item_id: "", category_id: "", quantity: 1 }] }));
    setLineOptions(prev => [...prev, { categories: getServiceCats(), items: [], selectedCategory: "" }]);
  };

  const setRequiredLine = (i, key, val) => setForm(p => {
    const lines = [...p.required_lines];
    lines[i] = { ...lines[i], [key]: val };
    return { ...p, required_lines: lines };
  });

  const handleRequiredCategoryChange = (i, catId) => {
    setRequiredLine(i, "category_id", catId);
    setRequiredLine(i, "item_id", "");
    setLineOptions(prev => {
      const updated = [...prev];
      updated[i] = { ...updated[i], selectedCategory: catId, items: [] };
      return updated;
    });
    if (!catId) return;
    fetch(`${API}/categories/${catId}/items`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const its = Array.isArray(d) ? d : (d.items || []);
        setLineOptions(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], items: its };
          return updated;
        });
      }).catch(() => {});
  };

  const removeRequiredLine = (i) => {
    setForm(p => ({ ...p, required_lines: p.required_lines.filter((_, idx) => idx !== i) }));
    setLineOptions(prev => prev.filter((_, idx) => idx !== i));
  };

  const addRewardLine = () => {
    setForm(p => ({ ...p, reward_lines: [...p.reward_lines, { item_id: "", category_id: "", quantity: 1 }] }));
    setRewardLineOptions(prev => [...prev, { categories: getServiceCats(), items: [], selectedCategory: "" }]);
  };

  const setRewardLine = (i, key, val) => setForm(p => {
    const lines = [...p.reward_lines];
    lines[i] = { ...lines[i], [key]: val };
    return { ...p, reward_lines: lines };
  });

  const handleRewardCategoryChange = (i, catId) => {
    setRewardLine(i, "category_id", catId);
    setRewardLine(i, "item_id", "");
    setRewardLineOptions(prev => {
      const updated = [...prev];
      updated[i] = { ...updated[i], selectedCategory: catId, items: [] };
      return updated;
    });
    if (!catId) return;
    fetch(`${API}/categories/${catId}/items`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const its = Array.isArray(d) ? d : (d.items || []);
        setRewardLineOptions(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], items: its };
          return updated;
        });
      }).catch(() => {});
  };

  const removeRewardLine = (i) => {
    setForm(p => ({ ...p, reward_lines: p.reward_lines.filter((_, idx) => idx !== i) }));
    setRewardLineOptions(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setMsg({ type: "error", text: "El título es requerido" }); return; }
    if (!form.starts_at || !form.ends_at) { setMsg({ type: "error", text: "Fechas de vigencia requeridas" }); return; }
    if (form.required_lines.length === 0) { setMsg({ type: "error", text: "Agrega al menos un item requerido" }); return; }
    setSaving(true); setMsg(null);
    try {
      const body = {
        ...form,
        service_id: form.service_id || null,
        client_type_id: form.client_type_id || null,
        bundle_price: form.bundle_price ? parseFloat(form.bundle_price) : null,
        discount_pct: form.discount_pct ? parseFloat(form.discount_pct) : null,
        required_lines: form.required_lines.map(l => ({ item_id: l.item_id || null, quantity: parseInt(l.quantity) })),
        reward_lines: form.reward_lines.map(l => ({ item_id: l.item_id, quantity: parseInt(l.quantity) })),
      };
      const res = await fetch(`${API}/api/v1/promotions`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (res.ok) {
        setForm(EMPTY_FORM); setShowForm(false); loadAll();
        setMsg({ type: "success", text: "Promoción creada" });
      } else setMsg({ type: "error", text: d.message || "Error" });
    } catch { setMsg({ type: "error", text: "Error de conexión" }); }
    finally { setSaving(false); }
  };

  const handleToggle = async (promo) => {
    await fetch(`${API}/api/v1/promotions/${promo.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ active: !promo.active }),
    });
    loadAll();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar esta promoción?")) return;
    await fetch(`${API}/api/v1/promotions/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    loadAll();
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", p: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 860, mx: "auto" }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/business-admin-dashboard")} sx={{ mb: 2 }}>
          Regresar
        </Button>
        <Typography variant="h5" fontWeight={700} mb={2}>Promociones y Mensajes</Typography>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }} variant="fullWidth">
          <Tab label="Promociones" />
          <Tab label={<Box display="flex" alignItems="center" gap={0.5}><WhatsAppIcon fontSize="small" sx={{ color: "#25D366" }} /> Mensajes Automáticos</Box>} />
        </Tabs>

        {/* ─── TAB MENSAJES AUTOMÁTICOS ─── */}
        {tab === 1 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              Los mensajes se envían automáticamente por WhatsApp a clientes que dieron su consentimiento.
              Usa <strong>{"{nombre}"}</strong> para el nombre del cliente y <strong>{"{folio}"}</strong> para el número de orden.
            </Alert>
            {waMsgState && <Alert severity={waMsgState.type} sx={{ mb: 2 }} onClose={() => setWaMsgState(null)}>{waMsgState.text}</Alert>}
            <Stack spacing={2}>
              {Object.entries(TRIGGER_META).map(([trigger, meta]) => {
                const saved = templates[trigger];
                const isEditing = editingTrigger === trigger;
                const currentBody = saved?.message_body || DEFAULT_MESSAGES[trigger];
                return (
                  <Paper key={trigger} elevation={2} sx={{ p: 3, borderRadius: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography fontWeight={700} fontSize={16}>
                          {meta.icon} {meta.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{meta.hint}</Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        {saved && (
                          <Tooltip title={saved.is_active ? "Desactivar" : "Activar"}>
                            <FormControlLabel
                              control={
                                <Switch
                                  size="small"
                                  checked={saved.is_active}
                                  onChange={() => handleToggleTemplate(trigger)}
                                  color="success"
                                />
                              }
                              label={saved.is_active ? "Activo" : "Inactivo"}
                              sx={{ m: 0 }}
                            />
                          </Tooltip>
                        )}
                        <IconButton size="small" onClick={() => { setEditingTrigger(trigger); setEditText(currentBody); setWaMsgState(null); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                    <Divider sx={{ my: 1.5 }} />
                    {isEditing ? (
                      <Box>
                        <TextField
                          fullWidth
                          multiline
                          minRows={3}
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          placeholder={DEFAULT_MESSAGES[trigger]}
                          sx={{ mb: 1.5 }}
                        />
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            size="small"
                            disabled={waSaving}
                            onClick={() => handleSaveTemplate(trigger)}
                            sx={{ bgcolor: "#25D366", "&:hover": { bgcolor: "#1ebe5c" } }}
                          >
                            {waSaving ? "Guardando..." : "Guardar"}
                          </Button>
                          <Button size="small" onClick={() => setEditingTrigger(null)}>Cancelar</Button>
                        </Stack>
                      </Box>
                    ) : (
                      <Box sx={{ bgcolor: "grey.50", borderRadius: 2, p: 1.5 }}>
                        <Typography variant="body2" color={saved ? "text.primary" : "text.secondary"} fontStyle={saved ? "normal" : "italic"}>
                          {currentBody}
                        </Typography>
                        {!saved && (
                          <Chip label="Sin configurar — se usará el mensaje por defecto" size="small" color="warning" variant="outlined" sx={{ mt: 1 }} />
                        )}
                      </Box>
                    )}
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        )}

        {/* ─── TAB PROMOCIONES ─── */}
        {tab === 0 && (
          <Box>
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setShowForm(v => !v); setMsg(null); }}>
            {showForm ? "Cancelar" : "Nueva Promoción"}
          </Button>
        </Box>

        {msg && <Alert severity={msg.type} sx={{ mb: 2 }}>{msg.text}</Alert>}

        {/* ─── FORMULARIO NUEVA PROMO ─── */}
        <Collapse in={showForm}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>Nueva Promoción</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <TextField fullWidth required label="Nombre de la promoción" value={form.title}
                  onChange={e => setField("title", e.target.value.replace(/\b\w/g, c => c.toUpperCase()))} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth select label="Tipo de promoción" value={form.promo_type}
                  onChange={e => setField("promo_type", e.target.value)}>
                  <MenuItem value="bundle_price">Paquete precio fijo</MenuItem>
                  <MenuItem value="buy_get_free">Compra N lleva M gratis</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline rows={2} label="Descripción (opcional)" value={form.description}
                  onChange={e => setField("description", e.target.value.replace(/^\w/, c => c.toUpperCase()))} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth select required label="Servicio" value={form.service_id}
                  onChange={e => handleServiceChange(e.target.value)}
                  helperText="La promo solo aplica a este servicio">
                  <MenuItem value="">— Seleccionar —</MenuItem>
                  {services.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth select label="Solo para tipo de cliente" value={form.client_type_id}
                  onChange={e => setField("client_type_id", e.target.value)}>
                  <MenuItem value="">Todos los clientes</MenuItem>
                  {clientTypes.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth select label="Sucursal" value={form.branch_id}
                  onChange={e => setField("branch_id", e.target.value)}>
                  <MenuItem value="">Todas las sucursales</MenuItem>
                  {branches.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                </TextField>
              </Grid>
              {form.promo_type === "bundle_price" && (
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth label="Precio del paquete ($)" type="number" value={form.bundle_price}
                    onChange={e => setField("bundle_price", e.target.value)}
                    inputProps={{ min: 0, step: 0.01 }} required />
                </Grid>
              )}
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Fecha inicio" type="date" value={form.starts_at}
                  onChange={e => setField("starts_at", e.target.value)}
                  InputLabelProps={{ shrink: true }} required inputProps={{ min: today }} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Fecha fin" type="date" value={form.ends_at}
                  onChange={e => setField("ends_at", e.target.value)}
                  InputLabelProps={{ shrink: true }} required inputProps={{ min: form.starts_at || today }} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControlLabel control={<Switch checked={form.active} onChange={e => setField("active", e.target.checked)} />}
                  label="Activa al crear" sx={{ mt: 1 }} />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* LÍNEAS REQUERIDAS */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle1" fontWeight={600}>Items requeridos</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={addRequiredLine}>Agregar item</Button>
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              El cliente debe llevar estas prendas/items en el servicio seleccionado para que aplique la promo.
            </Typography>
            {form.required_lines.length === 0 && (
              <Alert severity="info" sx={{ mb: 1 }}>Agrega al menos un item requerido</Alert>
            )}
            <Stack spacing={1} mb={2}>
              {form.required_lines.map((line, i) => (
                <Box key={i} display="flex" gap={1} alignItems="center" flexWrap="wrap">
                  <TextField select label="Categoría" value={lineOptions[i]?.selectedCategory || ""}
                    onChange={e => handleRequiredCategoryChange(i, e.target.value)}
                    sx={{ flex: 2, minWidth: 130 }} size="small"
                    disabled={!form.service_id}>
                    <MenuItem value="">— Seleccionar —</MenuItem>
                    {(lineOptions[i]?.categories || []).map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                  </TextField>
                  <TextField select label="Artículo" value={line.item_id}
                    onChange={e => setRequiredLine(i, "item_id", e.target.value)}
                    sx={{ flex: 3, minWidth: 130 }} size="small"
                    disabled={!lineOptions[i]?.selectedCategory}>
                    <MenuItem value="">— Seleccionar —</MenuItem>
                    {(lineOptions[i]?.items || []).map(it => <MenuItem key={it.id} value={it.id}>{it.name}</MenuItem>)}
                  </TextField>
                  <TextField label="Cant." type="number" value={line.quantity}
                    onChange={e => setRequiredLine(i, "quantity", e.target.value)}
                    inputProps={{ min: 1 }} sx={{ width: 70 }} size="small" />
                  <IconButton size="small" color="error" onClick={() => removeRequiredLine(i)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>

            {/* LÍNEAS DE REGALO (solo buy_get_free) */}
            {form.promo_type === "buy_get_free" && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle1" fontWeight={600}>Items de regalo</Typography>
                  <Button size="small" startIcon={<AddIcon />} onClick={addRewardLine}>Agregar regalo</Button>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  Estos items se agregan gratis al carrito cuando se cumple la promo.
                </Typography>
                <Stack spacing={1} mb={2}>
                  {form.reward_lines.map((line, i) => (
                    <Box key={i} display="flex" gap={1} alignItems="center" flexWrap="wrap">
                      <TextField select label="Categoría" value={rewardLineOptions[i]?.selectedCategory || ""}
                        onChange={e => handleRewardCategoryChange(i, e.target.value)}
                        sx={{ flex: 2, minWidth: 130 }} size="small"
                        disabled={!form.service_id}>
                        <MenuItem value="">— Seleccionar —</MenuItem>
                        {(rewardLineOptions[i]?.categories || []).map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                      </TextField>
                      <TextField select label="Artículo gratis" value={line.item_id}
                        onChange={e => setRewardLine(i, "item_id", e.target.value)}
                        sx={{ flex: 3, minWidth: 130 }} size="small"
                        disabled={!rewardLineOptions[i]?.selectedCategory}>
                        <MenuItem value="">— Seleccionar —</MenuItem>
                        {(rewardLineOptions[i]?.items || []).map(it => <MenuItem key={it.id} value={it.id}>{it.name}</MenuItem>)}
                      </TextField>
                      <TextField label="Cant." type="number" value={line.quantity}
                        onChange={e => setRewardLine(i, "quantity", e.target.value)}
                        inputProps={{ min: 1 }} sx={{ width: 70 }} size="small" />
                      <IconButton size="small" color="error" onClick={() => removeRewardLine(i)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              </>
            )}

            <Box display="flex" justifyContent="flex-end" gap={2} mt={1}>
              <Button variant="outlined" onClick={() => { setForm(EMPTY_FORM); setShowForm(false); }}>Cancelar</Button>
              <Button variant="contained"
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                onClick={handleSave} disabled={saving}>
                Guardar Promoción
              </Button>
            </Box>
          </Paper>
        </Collapse>

        {/* ─── LISTA DE PROMOS ─── */}
        {promotions.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
            <Typography color="text.secondary">Aún no tienes promociones. ¡Crea la primera!</Typography>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {promotions.map(p => {
              const valid = p.active && new Date() >= new Date(p.starts_at) && new Date() <= new Date(p.ends_at);
              return (
                <Paper key={p.id} elevation={2} sx={{ borderRadius: 3, overflow: "hidden",
                  borderLeft: `4px solid ${valid ? "#4caf50" : "#bdbdbd"}` }}>
                  <Box sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                      <Box flex={1}>
                        <Box display="flex" alignItems="center" gap={1} mb={0.5} flexWrap="wrap">
                          <Typography variant="subtitle1" fontWeight={700}>{p.title}</Typography>
                          <Chip size="small" label={p.promo_type === "bundle_price" ? "Paquete precio fijo" : "Compra N lleva M gratis"}
                            color="primary" variant="outlined" />
                          {p.service_name && <Chip size="small" label={p.service_name} color="secondary" variant="outlined" />}
                          {p.client_type_name && <Chip size="small" label={p.client_type_name} />}
                          <Chip size="small" label={valid ? "Activa" : (p.active ? "Fuera de vigencia" : "Inactiva")}
                            color={valid ? "success" : "default"} />
                        </Box>
                        {p.description && <Typography variant="body2" color="text.secondary">{p.description}</Typography>}
                        <Typography variant="caption" color="text.secondary">
                          Vigencia: {p.starts_at ? new Date(p.starts_at).toLocaleDateString("es-MX") : "—"} → {p.ends_at ? new Date(p.ends_at).toLocaleDateString("es-MX") : "—"}
                          {p.bundle_price ? ` · Precio paquete: $${p.bundle_price.toFixed(2)}` : ""}
                        </Typography>
                      </Box>
                      <Box display="flex" gap={0.5} alignItems="center">
                        <Button size="small" onClick={() => handleToggle(p)}>
                          {p.active ? "Desactivar" : "Activar"}
                        </Button>
                        <IconButton size="small" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                          {expanded === p.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(p.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>
                  <Collapse in={expanded === p.id}>
                    <Divider />
                    <Box sx={{ p: 2, bgcolor: "action.hover" }}>
                      <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>Items requeridos:</Typography>
                      {(p.required_lines || []).map((l, i) => (
                        <Typography key={i} variant="body2">• {l.item_name || "Cualquier item"} × {l.quantity}</Typography>
                      ))}
                      {p.promo_type === "buy_get_free" && (p.reward_lines || []).length > 0 && (
                        <>
                          <Typography variant="caption" fontWeight={700} display="block" mt={1} mb={0.5}>Items de regalo:</Typography>
                          {p.reward_lines.map((l, i) => (
                            <Typography key={i} variant="body2" color="success.main">🎁 {l.item_name} × {l.quantity} gratis</Typography>
                          ))}
                        </>
                      )}
                    </Box>
                  </Collapse>
                </Paper>
              );
            })}
          </Stack>
        )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
