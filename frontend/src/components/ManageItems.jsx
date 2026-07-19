// src/components/ManageItems.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
} from "@mui/material";

// Íconos
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import InventoryIcon from "@mui/icons-material/Inventory";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DashboardIcon from "@mui/icons-material/Dashboard";

// Función utilitaria simple para capitalizar la primera letra de cada palabra
const toTitleCase = (str) => {
  if (!str) return "";
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

const ManageItems = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        // Navegar a login si no hay token
        navigate("/login");
        return;
      }

      // 1. Obtener datos de la Categoría
      const categoryResponse = await fetch(
        `${API_BASE_URL}/categories/${categoryId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!categoryResponse.ok) {
        throw new Error("Error al cargar la categoría.");
      }
      const categoryData = await categoryResponse.json();
      // Aseguramos que el nombre de la categoría esté en formato Title Case
      setCategory({ ...categoryData, name: toTitleCase(categoryData.name) });

      // 2. Obtener la Lista de Artículos
      const itemsResponse = await fetch(
        `${API_BASE_URL}/categories/${categoryId}/items`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!itemsResponse.ok) {
        const errorData = await itemsResponse.json();
        throw new Error(errorData.message || "Error al cargar los artículos.");
      }
      const itemsData = await itemsResponse.json();
      setItems(itemsData.items);
    } catch (err) {
      setError(err.message);
      console.error("Error en la solicitud:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (categoryId) {
      fetchItems();
    }
  }, [categoryId]);

  const handleDelete = async (itemId) => {
    if (
      !window.confirm(
        "¿Estás seguro de que quieres eliminar este artículo? Esta acción no se puede deshacer."
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_BASE_URL}/items/${itemId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Error al eliminar el artículo.");
      }

      // Actualiza la UI filtrando el artículo eliminado
      setItems(items.filter((item) => item.id !== itemId));
    } catch (err) {
      alert(`Hubo un error al eliminar: ${err.message}`);
    }
  };

  // --- Renderizado de Estado ---

  if (loading)
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          mt: 5,
        }}
      >
        <CircularProgress sx={{ mr: 2 }} />
        <Typography variant="h6">Cargando artículos...</Typography>
      </Box>
    );

  // Si hay un error, mostramos el mensaje de error y un botón para regresar
  if (error && !category)
    return (
      <Container maxWidth="sm" sx={{ mt: 5 }}>
        <Alert severity="error">Error: {error}</Alert>
        <Button
          variant="contained"
          sx={{ mt: 2 }}
          onClick={() => navigate("/manage-services")} // Podría ser /manage-categories
          startIcon={<ArrowBackIcon />}
        >
          Volver
        </Button>
      </Container>
    );

  // --- Renderizado Principal ---
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={4} sx={{ p: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          align="center"
          sx={{ mb: 1, color: "primary.main", fontWeight: 700 }}
        >
          <InventoryIcon sx={{ mr: 1, verticalAlign: "middle" }} /> Artículos
        </Typography>
        <Typography
          variant="h6"
          align="center"
          color="text.secondary"
          sx={{ mb: 3 }}
        >
          Categoría: **{category ? category.name : "Desconocida"}**
        </Typography>
        <Divider sx={{ mb: 3 }} />

        {/* Botón de Creación */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate(`/create-item/${categoryId}`)}
            sx={{ minWidth: 150 }}
          >
            Crear Nuevo Artículo
          </Button>
        </Box>

        {/* Mensaje de Error (si existe) */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Lista de Artículos */}
        {items.length > 0 ? (
          <List disablePadding>
            {items.map((item, index) => (
              <React.Fragment key={item.id}>
                <ListItem
                  sx={{
                    py: 1.5,
                    px: 2,
                    bgcolor: "#f9f9f9",
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {item.name}
                      </Typography>
                    }
                    secondary={
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.primary"
                      >
                        Precio: ${item.price ? item.price.toFixed(2) : "N/A"}
                      </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      {/* Botón de Edición -> color="secondary" */}
                      <IconButton
                        aria-label="edit"
                        onClick={() => navigate(`/edit-item/${item.id}`)}
                        color="secondary"
                      >
                        <EditIcon />
                      </IconButton>

                      {/* Botón de Eliminación -> color="error" */}
                      <IconButton
                        aria-label="delete"
                        onClick={() => handleDelete(item.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < items.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Alert severity="info" variant="outlined" sx={{ mt: 3 }}>
            No hay artículos en esta categoría. Usa el botón "Crear Nuevo
            Artículo" para empezar.
          </Alert>
        )}

        {/* Grupo de botones de navegación inferior */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mt: 4,
            pt: 2,
            borderTop: "1px solid #eee",
          }}
        >
          <Button
            onClick={() => navigate(-1)}
            variant="outlined"
            color="secondary"
            startIcon={<ArrowBackIcon />}
          >
            Regresar
          </Button>
          <Button
            onClick={() => navigate("/super-admin-dashboard")}
            variant="outlined"
            color="secondary"
            startIcon={<DashboardIcon />}
          >
            Volver al Inicio
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ManageItems;
