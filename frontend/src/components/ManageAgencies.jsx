import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Grid,
  Alert, Collapse, Divider, Tooltip, Avatar, MenuItem,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import BusinessIcon from "@mui/icons-material/Business";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import LinkIcon from "@mui/icons-material/Link";

const API = import.meta.env.VITE_API_URL || "";

export default function ManageAgencies() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");

  const [agencies, setAgencies] = useState([]);
  const [allBusinesses, setAllBusinesses] = useState([]);
  const [msg, setMsg] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [agencyDetails, setAgencyDetails] = useState({});

  // Create agency dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", contact_name: "", email: "", phone: "", notes: "" });
  const [editAgency, setEditAgency] = useState(null);

  // Create admin dialog
  const [adminDialog, setAdminDialog] = useState(null);
  const [adminForm, setAdminForm] = useState({ username: "", password: "" });

  // Assign business dialog
  const [assignDialog, setAssignDialog] = useState(null);
  const [assignBizId, setAssignBizId] = useState("");

  const load = useCallback(() => {
    fetch(`${API}/api/v1/agencies`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setAgencies(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/businesses`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setAllBusinesses(d.businesses || [])).catch(() => {});
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const loadAgencyDetail = async (id) => {
    const r = await fetch(`${API}/api/v1/agencies/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json();
    setAgencyDetails(prev => ({ ...prev, [id]: d }));
  };

  const toggleExpand = (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!agencyDetails[id]) loadAgencyDetail(id);
  };

  const handleSaveAgency = async () => {
    const method = editAgency ? "PUT" : "POST";
    const url = editAgency ? `${API}/api/v1/agencies/${editAgency.id}` : `${API}/api/v1/agencies`;
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(createForm),
    });
    if (r.ok) {
      setMsg({ type: "success", text: editAgency ? "Agencia actualizada" : "Agencia creada" });
      setCreateOpen(false); setEditAgency(null); setCreateForm({ name: "", contact_name: "", email: "", phone: "", notes: "" });
      load();
    } else setMsg({ type: "error", text: "Error al guardar" });
  };

  const handleCreateAdmin = async () => {
    const r = await fetch(`${API}/api/v1/agencies/${adminDialog}/create-admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(adminForm),
    });
    if (r.ok) {
      setMsg({ type: "success", text: "Agency Admin creado correctamente" });
      setAdminDialog(null); setAdminForm({ username: "", password: "" });
      if (agencyDetails[adminDialog]) loadAgencyDetail(adminDialog);
    } else { const e = await r.json(); setMsg({ type: "error", text: e.message || "Error" }); }
  };

  const handleAssignBusiness = async () => {
    if (!assignBizId) return;
    const r = await fetch(`${API}/api/v1/agencies/${assignDialog}/assign-business`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ business_id: Number(assignBizId) }),
    });
    if (r.ok) {
      setMsg({ type: "success", text: "Negocio asignado" });
      setAssignDialog(null); setAssignBizId("");
      load(); if (agencyDetails[assignDialog]) loadAgencyDetail(assignDialog);
    } else setMsg({ type: "error", text: "Error al asignar" });
  };

  const openEdit = (ag) => {
    setEditAgency(ag);
    setCreateForm({ name: ag.name, contact_name: ag.contact_name || "", email: ag.email || "", phone: ag.phone || "", notes: ag.notes || "" });
    setCreateOpen(true);
  };

  const unassignedBiz = allBusinesses.filter(b => !b.agency_id);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f0f2f5", p: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 960, mx: "auto" }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/super-admin-dashboard")} sx={{ mb: 2 }}>
          Regresar
        </Button>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h5" fontWeight={800}>Gestión de Agencias</Typography>
            <Typography variant="caption" color="text.secondary">{agencies.length} agencias registradas</Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setCreateOpen(true); setEditAgency(null); setCreateForm({ name: "", contact_name: "", email: "", phone: "", notes: "" }); }}
            sx={{ bgcolor: "#4361ee", "&:hover": { bgcolor: "#3251d3" }, borderRadius: 2, fontWeight: 700 }}>
            Nueva Agencia
          </Button>
        </Box>

        {msg && <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

        {agencies.length === 0 ? (
          <Paper elevation={0} sx={{ border: "1px dashed #e0e0e0", borderRadius: 3, p: 5, textAlign: "center" }}>
            <BusinessIcon sx={{ fontSize: 48, color: "#e0e0e0", mb: 1 }} />
            <Typography color="text.secondary">No hay agencias registradas aún</Typography>
          </Paper>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {agencies.map(ag => (
              <Paper key={ag.id} elevation={0} sx={{ border: "1px solid #e8eaed", borderRadius: 3, overflow: "hidden" }}>
                {/* Agency header */}
                <Box sx={{ p: 2.5, display: "flex", alignItems: "center", gap: 2, cursor: "pointer" }}
                  onClick={() => toggleExpand(ag.id)}>
                  <Avatar sx={{ bgcolor: "#4361ee", width: 40, height: 40 }}>{ag.name[0].toUpperCase()}</Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography fontWeight={700} fontSize={16}>{ag.name}</Typography>
                      <Chip label={ag.is_active ? "Activa" : "Inactiva"} size="small"
                        color={ag.is_active ? "success" : "default"} variant="outlined" />
                    </Box>
                    <Typography fontSize={12} color="text.secondary">
                      {ag.contact_name || "—"} · {ag.email || "—"} · {ag.phone || "—"}
                    </Typography>
                  </Box>
                  <Chip icon={<BusinessIcon fontSize="small" />} label={`${ag.business_count} negocios`} size="small"
                    sx={{ bgcolor: "#eef0fd", color: "#4361ee" }} />
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={e => { e.stopPropagation(); openEdit(ag); }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <IconButton size="small">{expanded === ag.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
                </Box>

                {/* Expanded detail */}
                <Collapse in={expanded === ag.id}>
                  <Divider />
                  <Box sx={{ p: 2.5, bgcolor: "#fafbfc" }}>
                    {agencyDetails[ag.id] ? (
                      <Grid container spacing={3}>
                        {/* Businesses */}
                        <Grid item xs={12} md={7}>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography fontWeight={700} fontSize={14}>Negocios asignados</Typography>
                            <Button size="small" startIcon={<LinkIcon />}
                              onClick={() => { setAssignDialog(ag.id); setAssignBizId(""); }}>
                              Asignar negocio
                            </Button>
                          </Box>
                          {(agencyDetails[ag.id].businesses || []).length === 0 ? (
                            <Typography fontSize={13} color="text.secondary">Sin negocios asignados</Typography>
                          ) : (
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                              {(agencyDetails[ag.id].businesses || []).map(b => (
                                <Chip key={b.id} label={`${b.name} (${b.vertical_type || "laundry"})`}
                                  size="small" sx={{ bgcolor: "#fff", border: "1px solid #e0e0e0" }} />
                              ))}
                            </Box>
                          )}
                        </Grid>

                        {/* Admins */}
                        <Grid item xs={12} md={5}>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography fontWeight={700} fontSize={14}>Agency Admins</Typography>
                            <Button size="small" startIcon={<PersonAddIcon />}
                              onClick={() => { setAdminDialog(ag.id); setAdminForm({ username: "", password: "" }); }}>
                              Crear admin
                            </Button>
                          </Box>
                          {(agencyDetails[ag.id].admins || []).length === 0 ? (
                            <Typography fontSize={13} color="text.secondary">Sin admins asignados</Typography>
                          ) : (
                            <Box display="flex" flexDirection="column" gap={0.5}>
                              {(agencyDetails[ag.id].admins || []).map(a => (
                                <Chip key={a.id} label={a.username} size="small" icon={<PersonAddIcon />}
                                  sx={{ bgcolor: "#fff", border: "1px solid #e0e0e0", justifyContent: "flex-start" }} />
                              ))}
                            </Box>
                          )}
                        </Grid>
                        {ag.notes && (
                          <Grid item xs={12}>
                            <Typography fontSize={12} color="text.secondary">📝 {ag.notes}</Typography>
                          </Grid>
                        )}
                      </Grid>
                    ) : (
                      <Typography fontSize={13} color="text.secondary">Cargando...</Typography>
                    )}
                  </Box>
                </Collapse>
              </Paper>
            ))}
          </Box>
        )}
      </Box>

      {/* Create/Edit Agency dialog */}
      <Dialog open={createOpen} onClose={() => { setCreateOpen(false); setEditAgency(null); }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={800}>{editAgency ? "Editar Agencia" : "Nueva Agencia"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} pt={1}>
            {[["name", "Nombre de la agencia *"], ["contact_name", "Nombre del contacto"], ["email", "Email"], ["phone", "Teléfono"]].map(([k, l]) => (
              <Grid item xs={12} sm={k === "name" ? 12 : 6} key={k}>
                <TextField fullWidth label={l} value={createForm[k]} onChange={e => setCreateForm(p => ({ ...p, [k]: e.target.value }))} />
              </Grid>
            ))}
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={2} label="Notas internas" value={createForm.notes}
                onChange={e => setCreateForm(p => ({ ...p, notes: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setCreateOpen(false); setEditAgency(null); }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveAgency}
            sx={{ bgcolor: "#4361ee", "&:hover": { bgcolor: "#3251d3" }, borderRadius: 2, fontWeight: 700 }}>
            {editAgency ? "Guardar cambios" : "Crear agencia"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create agency admin dialog */}
      <Dialog open={Boolean(adminDialog)} onClose={() => setAdminDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={800}>Crear Agency Admin</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} pt={1}>
            <Grid item xs={12}>
              <TextField fullWidth label="Usuario" value={adminForm.username} onChange={e => setAdminForm(p => ({ ...p, username: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Contraseña" type="password" value={adminForm.password} onChange={e => setAdminForm(p => ({ ...p, password: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAdminDialog(null)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreateAdmin}
            sx={{ bgcolor: "#4361ee", "&:hover": { bgcolor: "#3251d3" }, borderRadius: 2, fontWeight: 700 }}>
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign business dialog */}
      <Dialog open={Boolean(assignDialog)} onClose={() => setAssignDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={800}>Asignar Negocio a Agencia</DialogTitle>
        <DialogContent dividers>
          <TextField select fullWidth label="Negocio" value={assignBizId} onChange={e => setAssignBizId(e.target.value)} sx={{ mt: 1 }}>
            {unassignedBiz.length === 0 && <MenuItem disabled>Sin negocios disponibles</MenuItem>}
            {unassignedBiz.map(b => (
              <MenuItem key={b.id} value={b.id}>{b.name} ({b.vertical_type || "laundry"})</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAssignDialog(null)}>Cancelar</Button>
          <Button variant="contained" onClick={handleAssignBusiness} disabled={!assignBizId}
            sx={{ bgcolor: "#4361ee", "&:hover": { bgcolor: "#3251d3" }, borderRadius: 2, fontWeight: 700 }}>
            Asignar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
