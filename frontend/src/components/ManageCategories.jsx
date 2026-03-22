// src/components/ManageCategories.jsx

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  Box,
  Typography,
  Button,
  Paper,
  Divider,
  Alert,
  CircularProgress,
  TextField,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from "@mui/material";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CategoryIcon from "@mui/icons-material/Category";
import SaveIcon from "@mui/icons-material/Save";

import { toTitleCase } from "../utils";

const API_BASE_URL = import.meta.env.VITE_API_URL || API;

export default function ManageCategories() {
  const navigate = useNavigate();
  const { serviceId } = useParams();

  const token = useMemo(() => localStorage.getItem("access_token"), []);
  const authHeaders = useMemo(() => {
    if (!token) return null;
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }, [token]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [serviceInfo, setServiceInfo] = useState(null); // {id,name}
  const [categories, setCategories] = useState([]); // [{id,name}]

  // create
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creating, setCreating] = useState(false);

  // edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchCategories = useCallback(async () => {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (!authHeaders) {
        setError("No hay sesión activa. Vuelve a iniciar sesión.");
        navigate("/login");
        return;
      }

      const res = await fetch(
        `${API_BASE_URL}/services/${serviceId}/categories`,
        { method: "GET", headers: authHeaders },
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.message || `Error ${res.status} al cargar categorías.`,
        );
      }

      if (data.service) {
        setServiceInfo({
          id: data.service.id,
          name: toTitleCase(data.service.name),
        });
      } else {
        setServiceInfo({ id: Number(serviceId), name: "" });
      }

      setCategories(
        (data.categories || []).map((c) => ({
          ...c,
          name: toTitleCase(c.name),
        })),
      );
    } catch (e) {
      setError(e.message || "Error inesperado al cargar categorías.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, navigate, serviceId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const name = newCategoryName.trim();
    if (!name) {
      setError("El nombre de la categoría no puede estar vacío.");
      return;
    }

    try {
      if (!authHeaders) {
        setError("No hay sesión activa. Vuelve a iniciar sesión.");
        navigate("/login");
        return;
      }

      setCreating(true);

      const res = await fetch(
        `${API_BASE_URL}/services/${serviceId}/categories`,
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ name: toTitleCase(name) }),
        },
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error("Esa categoría ya existe en este servicio.");
        }
        throw new Error(data.message || "Error al crear la categoría.");
      }

      setMessage(`Categoría "${toTitleCase(name)}" creada.`);
      setNewCategoryName("");
      await fetchCategories();
    } catch (e2) {
      setError(e2.message || "Error inesperado al crear categoría.");
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (cat) => {
    setError("");
    setMessage("");
    setEditId(cat.id);
    setEditName(cat.name || "");
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (savingEdit) return;
    setEditOpen(false);
    setEditId(null);
    setEditName("");
  };

  const handleSaveEdit = async () => {
    setError("");
    setMessage("");

    const name = editName.trim();
    if (!name) {
      setError("El nombre no puede estar vacío.");
      return;
    }

    try {
      if (!authHeaders) {
        setError("No hay sesión activa. Vuelve a iniciar sesión.");
        navigate("/login");
        return;
      }

      setSavingEdit(true);

      const res = await fetch(`${API_BASE_URL}/categories/${editId}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ name: toTitleCase(name) }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(
            "Ya existe una categoría con ese nombre en este servicio.",
          );
        }
        throw new Error(data.message || "Error al actualizar la categoría.");
      }

      setMessage("Categoría actualizada.");
      setEditOpen(false);
      setEditId(null);
      setEditName("");
      await fetchCategories();
    } catch (e) {
      setError(e.message || "Error inesperado al actualizar categoría.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (cat) => {
    setError("");
    setMessage("");

    const ok = window.confirm(
      `¿Eliminar la categoría "${cat.name}"?\n\nEsto puede afectar items vinculados a esa categoría.`,
    );
    if (!ok) return;

    try {
      if (!authHeaders) {
        setError("No hay sesión activa. Vuelve a iniciar sesión.");
        navigate("/login");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/categories/${cat.id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Error al eliminar la categoría.");
      }

      setMessage(`Categoría "${cat.name}" eliminada.`);
      await fetchCategories();
    } catch (e) {
      setError(e.message || "Error inesperado al eliminar categoría.");
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Cargando categorías...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, width: "100%" }}>
      <Paper elevation={3} sx={{ p: 3 }}>

        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <CategoryIcon color="primary" />
            <Typography variant="h5" fontWeight="bold">
              Administrar Categorías —{" "}
              <span style={{ color: "#1976d2" }}>
                {serviceInfo?.name || `Servicio ${serviceId}`}
              </span>
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchCategories}>
              Refrescar
            </Button>
            <Button variant="outlined" color="secondary" startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/manage-services")}>
              Volver
            </Button>
          </Stack>
        </Stack>

        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Divider sx={{ mb: 3 }} />

        {/* Crear categoría */}
        <Box component="form" onSubmit={handleCreateCategory} sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} mb={1}>Nueva categoría</Typography>
          <Stack direction="row" spacing={1}>
            <TextField
              fullWidth size="small"
              label="Nombre de la categoría"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(toTitleCase(e.target.value))}
              disabled={creating}
            />
            <Button type="submit" variant="contained"
              startIcon={creating ? <CircularProgress size={18} color="inherit" /> : <AddIcon />}
              disabled={creating || !newCategoryName.trim()}>
              Crear
            </Button>
          </Stack>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Grid de categorías */}
        {categories.length === 0 ? (
          <Alert severity="info" variant="outlined">Aún no hay categorías para este servicio.</Alert>
        ) : (
          <Box sx={{
            display: "grid",
            gridTemplateColumns: "repeat(8, 1fr)",
            gap: 2,
          }}>
            {categories.map((cat) => (
              <Card key={cat.id} elevation={2} sx={{
                transition: "box-shadow 0.2s",
                "&:hover": { boxShadow: 6 },
              }}>
                <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 2, "&:last-child": { pb: 2 } }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">{cat.name}</Typography>
                    <Typography variant="caption" color="text.secondary">ID: {cat.id}</Typography>
                  </Box>
                  <Box display="flex" gap={0.5}>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => openEdit(cat)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={() => handleDelete(cat)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Paper>

      {/* Dialog editar */}
      <Dialog open={editOpen} onClose={closeEdit} fullWidth maxWidth="xs">
        <DialogTitle>Editar Categoría</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth margin="normal" label="Nombre"
            value={editName}
            onChange={(e) => setEditName(toTitleCase(e.target.value))}
            disabled={savingEdit}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit} disabled={savingEdit}>Cancelar</Button>
          <Button onClick={handleSaveEdit} variant="contained"
            startIcon={savingEdit ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            disabled={savingEdit || !editName.trim()}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
