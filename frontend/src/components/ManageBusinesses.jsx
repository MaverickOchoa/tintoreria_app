import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container, Box, Typography, Button, Paper, Alert, CircularProgress,
  Divider, Accordion, AccordionSummary, AccordionDetails, Table,
  TableBody, TableCell, TableHead, TableRow, Stack, Chip, Dialog,
  DialogTitle, DialogContent, DialogContentText, DialogActions, TextField,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import LockResetIcon from "@mui/icons-material/LockReset";

import CreateBranchForm from "./CreateBranchForm";
import { toTitleCase } from "../utils";

const API_BASE_URL = import.meta.env.VITE_API_URL || API;

export default function ManageBusinesses() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [businesses, setBusinesses] = useState([]);
  const [branchesByBusiness, setBranchesByBusiness] = useState({});
  const [branchesLoadingByBusiness, setBranchesLoadingByBusiness] = useState({});
  const [showCreateBranchForm, setShowCreateBranchForm] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: "", id: null, name: "", isBranch: false });
  const [pwDialog, setPwDialog] = useState({ open: false, adminId: null, name: "" });
  const [pwValue, setPwValue] = useState("");
  const [pwMsg, setPwMsg] = useState({ type: "", text: "" });
  const [pwSaving, setPwSaving] = useState(false);

  const token = useMemo(() => localStorage.getItem("access_token"), []);
  const authHeaders = useMemo(() => {
    if (!token) return null;
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }, [token]);

  const fetchBusinesses = async () => {
    setError("");
    setLoading(true);
    try {
      if (!authHeaders) { navigate("/login"); return; }
      const res = await fetch(`${API_BASE_URL}/businesses`, { headers: authHeaders });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
      setBusinesses((data.businesses || []).map((b) => ({ ...b, name: toTitleCase(b.name) })));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchesForBusiness = async (businessId) => {
    setBranchesLoadingByBusiness((prev) => ({ ...prev, [businessId]: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/businesses/${businessId}/branches`, { headers: authHeaders });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
      setBranchesByBusiness((prev) => ({
        ...prev,
        [businessId]: (data.branches || []).map((br) => ({
          ...br, name: toTitleCase(br.name), address: br.address ? toTitleCase(br.address) : "",
        })),
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBranchesLoadingByBusiness((prev) => ({ ...prev, [businessId]: false }));
    }
  };

  useEffect(() => { fetchBusinesses(); }, []);

  const handleToggleBusiness = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/businesses/${id}/toggle`, { method: "PUT", headers: authHeaders });
      if (!res.ok) throw new Error("Error al cambiar estado");
      fetchBusinesses();
    } catch (e) { setError(e.message); }
  };

  const handleDeleteBusiness = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/businesses/${id}/toggle`, { method: "DELETE", headers: authHeaders });
      if (!res.ok) throw new Error("Error al eliminar");
      setBusinesses((prev) => prev.filter((b) => b.id !== id));
    } catch (e) { setError(e.message); }
    setConfirmDialog({ open: false });
  };

  const handleToggleBranch = async (branchId, businessId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/branches/${branchId}/toggle`, { method: "PUT", headers: authHeaders });
      if (!res.ok) throw new Error("Error al cambiar estado sucursal");
      fetchBranchesForBusiness(businessId);
    } catch (e) { setError(e.message); }
  };

  const handleDeleteBranch = async (branchId, businessId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/branches/${branchId}/toggle`, { method: "DELETE", headers: authHeaders });
      if (!res.ok) throw new Error("Error al eliminar sucursal");
      fetchBranchesForBusiness(businessId);
    } catch (e) { setError(e.message); }
    setConfirmDialog({ open: false });
  };

  const openConfirm = (type, id, name, isBranch = false, parentId = null) => {
    setConfirmDialog({ open: true, type, id, name, isBranch, parentId });
  };

  const openPwDialog = (adminId, name) => {
    setPwValue(""); setPwMsg({ type: "", text: "" });
    setPwDialog({ open: true, adminId, name });
  };

  const handleResetPassword = async () => {
    if (!pwValue || pwValue.length < 6) { setPwMsg({ type: "error", text: "Mínimo 6 caracteres" }); return; }
    setPwSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admins/${pwDialog.adminId}/password`, {
        method: "PUT", headers: authHeaders, body: JSON.stringify({ password: pwValue }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.message || `Error ${res.status}`);
      setPwMsg({ type: "success", text: "Contraseña actualizada" });
      setTimeout(() => setPwDialog({ open: false }), 1000);
    } catch (e) {
      setPwMsg({ type: "error", text: e.message });
    } finally {
      setPwSaving(false);
    }
  };

  const businessListForCreateBranch = useMemo(() => businesses.map((b) => ({ id: b.id, name: b.name })), [businesses]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Cargando Negocios...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button variant="outlined" color="secondary" startIcon={<ArrowBackIcon />} onClick={() => navigate("/super-admin-dashboard")}>
          Volver
        </Button>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchBusinesses}>Refrescar</Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={() => setShowCreateBranchForm((v) => !v)}>
          {showCreateBranchForm ? "Ocultar Crear Sucursal" : "Crear Sucursal"}
        </Button>
      </Stack>

      <Paper elevation={6} sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Administrar Negocios</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Gestiona negocios y sus sucursales. Los negocios/sucursales bloqueados aparecen en gris.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {showCreateBranchForm && (
          <>
            <Divider sx={{ my: 2 }} />
            <CreateBranchForm businessList={businessListForCreateBranch} toTitleCase={toTitleCase} />
            <Divider sx={{ my: 2 }} />
          </>
        )}

        {businesses.length === 0 ? (
          <Alert severity="info">No hay negocios creados todavía.</Alert>
        ) : (
          <Box sx={{ mt: 1 }}>
            {businesses.map((b) => (
              <Accordion
                key={b.id}
                sx={{ opacity: b.is_active === false ? 0.55 : 1, bgcolor: b.is_active === false ? "#f0f0f0" : undefined }}
                onChange={(_, expanded) => {
                  if (expanded && !branchesByBusiness[b.id]) fetchBranchesForBusiness(b.id);
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ width: "100%", display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography sx={{ fontWeight: 700 }}>
                      {b.name}{" "}
                      <Typography component="span" color="text.secondary">(ID: {b.id})</Typography>
                    </Typography>
                    {b.is_active === false && <Chip size="small" label="Bloqueado" color="error" />}
                    <Box sx={{ flex: 1 }} />
                    <Button component="div" size="small" variant="outlined" startIcon={<EditIcon />}
                      onClick={(e) => { e.stopPropagation(); navigate(`/edit-business/${b.id}`); }}>
                      Editar
                    </Button>
                    <Button component="div" size="small" variant="outlined" color="info"
                      startIcon={<LockResetIcon />}
                      onClick={(e) => { e.stopPropagation(); openPwDialog(b.owner_admin_id, b.name); }}>
                      Contraseña
                    </Button>
                    <Button component="div" size="small"
                      variant="outlined"
                      color={b.is_active === false ? "success" : "warning"}
                      startIcon={b.is_active === false ? <CheckCircleIcon /> : <BlockIcon />}
                      onClick={(e) => { e.stopPropagation(); handleToggleBusiness(b.id); }}>
                      {b.is_active === false ? "Activar" : "Bloquear"}
                    </Button>
                    <Button component="div" size="small" variant="outlined" color="error"
                      startIcon={<DeleteForeverIcon />}
                      onClick={(e) => { e.stopPropagation(); openConfirm("delete", b.id, b.name, false); }}>
                      Eliminar
                    </Button>
                  </Box>
                </AccordionSummary>

                <AccordionDetails>
                  {branchesLoadingByBusiness[b.id] ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, py: 2 }}>
                      <CircularProgress size={22} />
                      <Typography variant="body2">Cargando sucursales...</Typography>
                    </Box>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>ID</TableCell>
                          <TableCell>Nombre</TableCell>
                          <TableCell>Dirección</TableCell>
                          <TableCell>Estado</TableCell>
                          <TableCell align="right">Acciones</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(branchesByBusiness[b.id] || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5}>
                              <Alert severity="info" sx={{ mb: 0 }}>Sin sucursales.</Alert>
                            </TableCell>
                          </TableRow>
                        ) : (
                          (branchesByBusiness[b.id] || []).map((br) => (
                            <TableRow key={br.id} sx={{ opacity: br.is_active === false ? 0.5 : 1, bgcolor: br.is_active === false ? "#f5f5f5" : undefined }}>
                              <TableCell>{br.id}</TableCell>
                              <TableCell>{br.name}</TableCell>
                              <TableCell>{br.address || "-"}</TableCell>
                              <TableCell>
                                {br.is_active === false
                                  ? <Chip size="small" label="Bloqueada" color="error" />
                                  : <Chip size="small" label="Activa" color="success" />}
                              </TableCell>
                              <TableCell align="right">
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                  <Button size="small" variant="outlined" startIcon={<EditIcon />}
                                    onClick={() => navigate(`/edit-branch/${br.id}`)}>
                                    Editar
                                  </Button>
                                  <Button size="small" variant="outlined"
                                    color={br.is_active === false ? "success" : "warning"}
                                    startIcon={br.is_active === false ? <CheckCircleIcon /> : <BlockIcon />}
                                    onClick={() => handleToggleBranch(br.id, b.id)}>
                                    {br.is_active === false ? "Activar" : "Bloquear"}
                                  </Button>
                                  <Button size="small" variant="outlined" color="error"
                                    startIcon={<DeleteForeverIcon />}
                                    onClick={() => openConfirm("delete-branch", br.id, br.name, true, b.id)}>
                                    Eliminar
                                  </Button>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
      </Paper>

      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false })}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Seguro que quieres eliminar <strong>{confirmDialog.name}</strong>?
            Esta acción es irreversible y eliminará todos los datos asociados.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false })}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => {
            if (confirmDialog.type === "delete") handleDeleteBusiness(confirmDialog.id);
            else handleDeleteBranch(confirmDialog.id, confirmDialog.parentId);
          }}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={pwDialog.open} onClose={() => setPwDialog({ open: false })} maxWidth="xs" fullWidth>
        <DialogTitle>Cambiar contraseña — {pwDialog.name}</DialogTitle>
        <DialogContent>
          {pwMsg.text && <Alert severity={pwMsg.type} sx={{ mb: 2 }}>{pwMsg.text}</Alert>}
          <TextField
            fullWidth autoFocus type="password" label="Nueva contraseña"
            value={pwValue} onChange={e => setPwValue(e.target.value)}
            helperText="Mínimo 6 caracteres" sx={{ mt: 1 }}
            onKeyDown={e => e.key === "Enter" && handleResetPassword()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPwDialog({ open: false })}>Cancelar</Button>
          <Button variant="contained" onClick={handleResetPassword} disabled={pwSaving}>
            {pwSaving ? <CircularProgress size={18} /> : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
