import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container, Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, CircularProgress,
  Alert, TextField, InputAdornment, Button, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

const API = import.meta.env.VITE_API_URL || "";
const getClaims = () => { try { return JSON.parse(localStorage.getItem("user_claims") || "{}"); } catch { return {}; } };

export default function ClientsPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");

  const [searchTerm, setSearchTerm] = useState("");
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState(null);

  // Delete
  const [deleteId, setDeleteId] = useState(null);
  const [deleteMsg, setDeleteMsg] = useState(null);

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) return;
    setLoading(true); setError(null); setSearched(true);
    try {
      const res = await fetch(`${API}/api/v1/clients?search=${encodeURIComponent(searchTerm)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setClients(data.clients || []);
    } catch {
      setError("Error al buscar clientes.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, token]);

  const openEdit = (client) => {
    setEditClient(client);
    setEditForm({
      full_name: client.full_name || "",
      last_name: client.last_name || "",
      phone: client.phone || "",
      email: client.email || "",
      notes: client.notes || "",
    });
    setEditMsg(null);
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    setEditSaving(true); setEditMsg(null);
    try {
      const res = await fetch(`${API}/api/v1/clients/${editClient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok) {
        setClients(prev => prev.map(c => c.id === editClient.id ? { ...c, ...data.client } : c));
        setEditOpen(false);
      } else {
        setEditMsg(data.message || "Error al guardar");
      }
    } catch {
      setEditMsg("Error de conexión");
    }
    setEditSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este cliente? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`${API}/api/v1/clients/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setClients(prev => prev.filter(c => c.id !== id));
      } else {
        alert("Error al eliminar el cliente");
      }
    } catch {
      alert("Error de conexión");
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>Clientes</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/create-client")}>
          Nuevo Cliente
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box display="flex" gap={1}>
          <TextField
            fullWidth size="small" placeholder="Buscar por nombre o teléfono"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          />
          <Button variant="contained" onClick={handleSearch} disabled={loading} startIcon={<PersonSearchIcon />}>
            {loading ? <CircularProgress size={18} color="inherit" /> : "Buscar"}
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {searched && !loading && (
        <>
          {clients.length === 0 ? (
            <Alert severity="info">No se encontraron clientes con "{searchTerm}".</Alert>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f5f5f5" }}>
                  <TableRow>
                    <TableCell><strong>Nombre</strong></TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}><strong>Teléfono</strong></TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}><strong>Email</strong></TableCell>
                    <TableCell><strong>Tipo</strong></TableCell>
                    <TableCell align="center"><strong>Acciones</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clients.map(client => (
                    <TableRow key={client.id} hover>
                      <TableCell>{client.full_name}{client.last_name ? ` ${client.last_name}` : ""}</TableCell>
                      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{client.phone || "—"}</TableCell>
                      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{client.email || "—"}</TableCell>
                      <TableCell>{client.client_type || "Regular"}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="Ver perfil">
                          <IconButton size="small" color="primary" onClick={() => navigate(`/clients/${client.id}`)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Nueva orden">
                          <IconButton size="small" color="success" onClick={() => navigate(`/create-order/${client.id}`)}>
                            <ShoppingCartIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar cliente">
                          <IconButton size="small" color="warning" onClick={() => openEdit(client)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar cliente">
                          <IconButton size="small" color="error" onClick={() => handleDelete(client.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Editar Cliente</DialogTitle>
        <DialogContent>
          {editMsg && <Alert severity="error" sx={{ mb: 2 }}>{editMsg}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField fullWidth label="Nombre(s)" value={editForm.full_name || ""}
                onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Apellido(s)" value={editForm.last_name || ""}
                onChange={e => setEditForm(p => ({ ...p, last_name: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Teléfono" value={editForm.phone || ""}
                onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                inputProps={{ maxLength: 10 }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Email" value={editForm.email || ""}
                onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={2} label="Notas" value={editForm.notes || ""}
                onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleEditSave} disabled={editSaving}>
            {editSaving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
