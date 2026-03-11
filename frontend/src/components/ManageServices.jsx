// src/components/ManageServices.jsx

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  IconButton,
  Divider,
  Tooltip,
} from "@mui/material";

// Íconos
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import HomeRepairServiceIcon from "@mui/icons-material/HomeRepairService";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ListAltIcon from "@mui/icons-material/ListAlt";

const API_BASE_URL = import.meta.env.VITE_API_URL || API;

// Función utilitaria simple para capitalizar
const toTitleCase = (str) => {
  if (!str) return "";
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

function ManageServices() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);

    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      // ✅ backend_new
      const response = await fetch(`${API_BASE_URL}/services`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Error al obtener los servicios.");
      }

      const list = Array.isArray(data.services) ? data.services : [];

      setServices(
        list.map((s) => ({
          ...s,
          name: s?.name
            ? toTitleCase(s.name)
            : "Nombre de Servicio Desconocido",
        })),
      );
    } catch (err) {
      setError(err.message || "Error desconocido al cargar servicios.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleDeleteService = async (serviceId, serviceName) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return;
    }

    if (
      !window.confirm(
        `¿Estás seguro de que quieres eliminar el servicio '${serviceName}'?`,
      )
    ) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(
        `${API_BASE_URL}/services/${serviceId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Error al eliminar el servicio.");
      }

      setMessage(`Servicio '${serviceName}' eliminado exitosamente.`);
      fetchServices();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err.message || "Error desconocido al eliminar servicio.");
      setTimeout(() => setError(""), 5000);
    }
  };

  // Categorías: hoy navega, cuando existan endpoints ya funcionará
  const handleManageCategories = (serviceId) => {
    navigate(`/manage-categories/${serviceId}`);
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
        <CircularProgress sx={{ mr: 2 }} />
        <Typography variant="h6">Cargando servicios...</Typography>
      </Box>
    );
  }

  return (
    <Container
      maxWidth="sm"
      sx={{
        mt: 4,
        mb: 4,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Paper elevation={4} sx={{ p: 4, width: "100%" }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          align="center"
          sx={{ mb: 1, color: "primary.main", fontWeight: 700 }}
        >
          <HomeRepairServiceIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          Administrar Servicios
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            gap: 2,
            mb: 3,
          }}
        >
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/super-admin-dashboard")}
            sx={{ flexGrow: 1, py: 1.5 }}
          >
            Volver al Panel
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate("/create-service")}
            sx={{ flexGrow: 1, py: 1.5 }}
          >
            Crear Servicio
          </Button>
        </Box>

        {message && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {message}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <List disablePadding sx={{ mt: 2 }}>
          {services.length > 0 ? (
            services.map((service) => (
              <ListItem
                key={service.id}
                disablePadding
                sx={{
                  padding: "8px",
                  marginBottom: "4px",
                  borderRadius: "6px",
                  border: "1px solid #eee",
                  backgroundColor: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "background-color 0.2s",
                  "&:hover": { backgroundColor: "#f5f5f5" },
                }}
              >
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {service.name}
                    </Typography>
                  }
                  sx={{ flexGrow: 1, my: 0 }}
                />

                <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                  <Tooltip title="Administrar Categorías del Servicio">
                    <IconButton
                      size="small"
                      color="secondary"
                      onClick={() => handleManageCategories(service.id)}
                    >
                      <ListAltIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Editar Servicio">
                    <IconButton
                      size="small"
                      color="secondary"
                      onClick={() => navigate(`/edit-service/${service.id}`)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Eliminar Servicio">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() =>
                        handleDeleteService(service.id, service.name)
                      }
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </ListItem>
            ))
          ) : (
            <Alert severity="info" variant="outlined" sx={{ mt: 3 }}>
              No hay servicios registrados. Usa el botón superior para crear
              uno.
            </Alert>
          )}
        </List>
      </Paper>
    </Container>
  );
}

export default ManageServices;
