import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Alert, CircularProgress, Paper,
  IconButton, Divider, Tooltip, Card, CardContent, Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import InventoryIcon from "@mui/icons-material/Inventory";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const API_BASE_URL = import.meta.env.VITE_API_URL || API;

const getAuthClaims = () => {
  try { return JSON.parse(localStorage.getItem("user_claims") || "{}"); } catch { return {}; }
};

const ALLOWED_ROLES = new Set(["business_admin", "branch_manager"]);

export default function ManageItemsBusiness() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const claims = useMemo(() => getAuthClaims(), []);
  const token = localStorage.getItem("access_token");

  const [items, setItems] = useState([]);
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!claims.role || !ALLOWED_ROLES.has(claims.role)) navigate("/login");
  }, [claims.role, navigate]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Cargar nombre de categoría y artículos en paralelo
      const [catRes, itemsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/categories/${categoryId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/categories/${categoryId}/items`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        }),
      ]);
      const catData = await catRes.json();
      const itemsData = await itemsRes.json();
      if (!itemsRes.ok) throw new Error(itemsData.message || `Error ${itemsRes.status}`);
      setCategoryName(catData.name || catData.category_name || "");
      setItems(itemsData.items || []);
    } catch (err) {
      setError(err.message || "Error al cargar artículos.");
    } finally {
      setLoading(false);
    }
  }, [categoryId, token]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleDelete = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/items/${item.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Error al eliminar");
      }
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" mt={6}>
      <CircularProgress sx={{ mr: 2 }} />
      <Typography>Cargando artículos...</Typography>
    </Box>
  );

  return (
    <Box sx={{ p: 3, width: "100%" }}>
      <Paper elevation={3} sx={{ p: 3 }}>

        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <InventoryIcon color="primary" />
            <Typography variant="h5" fontWeight="bold">
              Artículos — <span style={{ color: "#1976d2" }}>{categoryName || `Categoría ${categoryId}`}</span>
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" startIcon={<AddIcon />}
              onClick={() => navigate(`/create-item-business/${categoryId}`)}>
              Agregar
            </Button>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
              Volver
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Divider sx={{ mb: 3 }} />

        {items.length > 0 ? (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 1.5 }}>
            {items.map((item) => (
              <Card key={item.id} elevation={2} sx={{ "&:hover": { boxShadow: 5 }, transition: "box-shadow 0.2s" }}>
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Typography variant="body2" fontWeight="bold" noWrap title={item.name}>{item.name}</Typography>
                  <Typography variant="caption" color="primary" fontWeight="bold">
                    ${parseFloat(item.price).toFixed(2)}
                  </Typography>
                  {item.description && (
                    <Typography variant="caption" color="text.secondary" display="block" noWrap>
                      {item.description}
                    </Typography>
                  )}
                  <Box display="flex" justifyContent="flex-end" mt={0.5} gap={0.5}>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => navigate(`/edit-item-business/${item.id}`)}>
                        <EditIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={() => handleDelete(item)}>
                        <DeleteIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <Alert severity="info" variant="outlined">
            No hay artículos en esta categoría para tu negocio.
          </Alert>
        )}
      </Paper>
    </Box>
  );
}
