import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Paper, Typography, Tabs, Tab, Button, Divider,
  TextField, IconButton, Tooltip, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Stack,
  Card, CardContent,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PaletteIcon from "@mui/icons-material/Palette";
import PatternIcon from "@mui/icons-material/Pattern";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import { toTitleCase } from "../utils";

const API = import.meta.env.VITE_API_URL || API;

const TABS = [
  { label: "Colores",     icon: <PaletteIcon />,        endpoint: "/api/v1/colors",  plural: "colors",  hasColor: true  },
  { label: "Estampados",  icon: <PatternIcon />,         endpoint: "/api/v1/prints",  plural: "prints",  hasColor: false },
  { label: "Defectos",    icon: <ReportProblemIcon />,   endpoint: "/api/v1/defects", plural: "defects", hasColor: false },
];

const emptyForm = { name: "", hex_code: "" };

const ManageDetails = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");

  const [tab, setTab] = useState(0);
  const [data, setData] = useState({ colors: [], prints: [], defects: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const current = TABS[tab];

  const fetchTab = async (t = tab) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}${TABS[t].endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      const sorted = (d[TABS[t].plural] || []).sort((a, b) => a.name.localeCompare(b.name, "es"));
      setData(prev => ({ ...prev, [TABS[t].plural]: sorted }));
    } catch {
      setError("Error al cargar datos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTab(tab); }, [tab]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const body = { name: form.name.trim() };
      if (current.hasColor && form.hex_code) body.hex_code = form.hex_code;
      const res = await fetch(`${API}${current.endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message);
      setData(prev => ({ ...prev, [current.plural]: [...prev[current.plural], d].sort((a, b) => a.name.localeCompare(b.name, "es")) }));
      setForm(emptyForm);
      setSuccess(`"${d.name}" creado.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editForm.name.trim()) return;
    setEditSubmitting(true);
    try {
      const body = { name: editForm.name.trim() };
      if (current.hasColor) body.hex_code = editForm.hex_code || null;
      const res = await fetch(`${API}${current.endpoint}/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message);
      setData(prev => ({
        ...prev,
        [current.plural]: prev[current.plural]
          .map(i => i.id === editTarget.id ? d : i)
          .sort((a, b) => a.name.localeCompare(b.name, "es")),
      }));
      setEditTarget(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleteSubmitting(true);
    try {
      const res = await fetch(`${API}${current.endpoint}/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message);
      }
      setData(prev => ({
        ...prev,
        [current.plural]: prev[current.plural].filter(i => i.id !== deleteTarget.id),
      }));
      setDeleteTarget(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const items = data[current.plural];

  return (
    <Box sx={{ p: 3, width: "100%" }}>
      <Paper elevation={3} sx={{ p: 3 }}>

        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
          <Typography variant="h5" fontWeight="bold">Gestión de Detalles</Typography>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate("/super-admin-dashboard")}>
            Volver
          </Button>
        </Stack>

        {error   && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          {TABS.map((t, i) => (
            <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>
        <Divider sx={{ mb: 3 }} />

        {/* Formulario crear */}
        <Box component="form" onSubmit={handleCreate} sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} mb={1}>
            Agregar {current.label.slice(0, -1)}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              size="small" label="Nombre" required
              value={form.name}
              onChange={e => setForm({ ...form, name: toTitleCase(e.target.value) })}
              disabled={submitting}
              sx={{ flex: 1 }}
            />
            {current.hasColor && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" color="text.secondary">Color:</Typography>
                <input
                  type="color"
                  value={form.hex_code || "#ffffff"}
                  onChange={e => setForm({ ...form, hex_code: e.target.value })}
                  style={{ width: 40, height: 36, border: "1px solid #ccc", borderRadius: 4, cursor: "pointer", padding: 2 }}
                />
                <TextField
                  size="small" label="Hex" placeholder="#ffffff"
                  value={form.hex_code}
                  onChange={e => setForm({ ...form, hex_code: e.target.value })}
                  disabled={submitting}
                  sx={{ width: 110 }}
                />
              </Box>
            )}
            <Button type="submit" variant="contained" startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
              disabled={submitting || !form.name.trim()}>
              Agregar
            </Button>
          </Stack>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Grid de items */}
        {loading ? (
          <Box textAlign="center" py={4}><CircularProgress /></Box>
        ) : items.length === 0 ? (
          <Alert severity="info" variant="outlined">No hay {current.label.toLowerCase()} registrados.</Alert>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 1.5 }}>
            {items.map(item => (
              <Card key={item.id} elevation={1} sx={{ "&:hover": { boxShadow: 4 }, transition: "box-shadow 0.2s" }}>
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                  {current.hasColor && item.hex_code && (
                    <Box sx={{ width: "100%", height: 24, borderRadius: 1, mb: 1, bgcolor: item.hex_code, border: "1px solid #e0e0e0" }} />
                  )}
                  <Typography variant="body2" fontWeight="bold" noWrap title={item.name}>{item.name}</Typography>
                  <Box display="flex" justifyContent="flex-end" mt={0.5} gap={0.5}>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => { setEditTarget(item); setEditForm({ name: item.name, hex_code: item.hex_code || "" }); }}>
                        <EditIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={() => setDeleteTarget(item)}>
                        <DeleteIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Paper>

      {/* Dialog Editar */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Editar {current.label.slice(0, -1)}</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth margin="normal" label="Nombre"
            value={editForm.name}
            onChange={e => setEditForm({ ...editForm, name: toTitleCase(e.target.value) })}
            disabled={editSubmitting}
          />
          {current.hasColor && (
            <Stack direction="row" spacing={1} alignItems="center" mt={1}>
              <Typography variant="body2">Color:</Typography>
              <input type="color" value={editForm.hex_code || "#ffffff"}
                onChange={e => setEditForm({ ...editForm, hex_code: e.target.value })}
                style={{ width: 40, height: 36, border: "1px solid #ccc", borderRadius: 4, cursor: "pointer", padding: 2 }} />
              <TextField size="small" label="Hex" value={editForm.hex_code}
                onChange={e => setEditForm({ ...editForm, hex_code: e.target.value })}
                sx={{ flex: 1 }} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTarget(null)} disabled={editSubmitting}>Cancelar</Button>
          <Button variant="contained" onClick={handleEdit}
            disabled={editSubmitting || !editForm.name.trim()}
            startIcon={editSubmitting ? <CircularProgress size={16} color="inherit" /> : null}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Eliminar */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs">
        <DialogTitle>Eliminar {current.label.slice(0, -1)}</DialogTitle>
        <DialogContent>
          <Typography>¿Eliminar <strong>{deleteTarget?.name}</strong>? Esta acción no se puede deshacer.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleteSubmitting}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDelete}
            disabled={deleteSubmitting}
            startIcon={deleteSubmitting ? <CircularProgress size={16} color="inherit" /> : null}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageDetails;
