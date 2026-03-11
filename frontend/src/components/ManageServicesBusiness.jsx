// src/components/ManageServicesBusiness.jsx

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
  Divider,
  Tooltip,
} from "@mui/material";

// Íconos
import HomeRepairServiceIcon from "@mui/icons-material/HomeRepairService";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ListAltIcon from "@mui/icons-material/ListAlt";

const API_BASE_URL = import.meta.env.VITE_API_URL || API;

// Función utilitaria simple para capitalizar
const toTitleCase = (str) => {
  if (!str) return "";
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

const getItemStyle = {
  padding: "10px 8px",
  marginBottom: "4px",
  borderRadius: "6px",
  border: "1px solid #ddd",
  backgroundColor: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  transition: "background-color 0.2s",
  "&:hover": {
    backgroundColor: "#f5f5f5",
  },
};

function ManageServicesBusiness() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);

    const token = localStorage.getItem("access_token");
    if (!token) {
      setError("No se encontró el token. Inicie sesión de nuevo.");
      setLoading(false);
      return;
    }

    try {
      // ✅ FIX: /api/v1 y trailing slash
      const response = await fetch(`${API_BASE_URL}/services`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Error al obtener los servicios.");
      }

      setServices(
        (data.services || []).map((s) => ({
          ...s,
          name: toTitleCase(s.name),
        })),
      );
    } catch (err) {
      console.error("Fetch Services Error:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleManageCategories = (serviceId) => {
    navigate(`/manage-categories-business/${serviceId}`);
  };

  if (loading)
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "80vh",
        }}
      >
        <CircularProgress sx={{ mr: 2 }} />
        <Typography variant="h6">Cargando servicios...</Typography>
      </Box>
    );

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={4} sx={{ p: 4, width: "100%" }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          align="center"
          sx={{ mb: 1, color: "primary.main", fontWeight: 700 }}
        >
          <HomeRepairServiceIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          Gestión de Servicios
        </Typography>

        <Typography
          variant="body1"
          align="center"
          color="text.secondary"
          sx={{ mb: 3 }}
        >
          Selecciona un servicio para administrar sus categorías y artículos.
        </Typography>

        <Divider sx={{ mb: 3 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {services.length > 0 ? (
          <List disablePadding sx={{ mt: 2 }}>
            {services.map((service) => (
              <ListItem key={service.id} disablePadding sx={getItemStyle}>
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {service.name}
                    </Typography>
                  }
                  sx={{ flexGrow: 1, my: 0 }}
                />

                <Tooltip title="Administrar Categorías">
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<ListAltIcon fontSize="small" />}
                    onClick={() => handleManageCategories(service.id)}
                  >
                    Administrar
                  </Button>
                </Tooltip>
              </ListItem>
            ))}
          </List>
        ) : (
          <Alert severity="info" variant="outlined" sx={{ mt: 3 }}>
            No hay servicios registrados o la lista está vacía.
          </Alert>
        )}

        <Divider sx={{ mt: 4, mb: 2 }} />

        <Button
          variant="outlined"
          color="secondary"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/business-admin-dashboard")}
          fullWidth
        >
          Volver al Panel de Administrador
        </Button>
      </Paper>
    </Container>
  );
}

export default ManageServicesBusiness;
