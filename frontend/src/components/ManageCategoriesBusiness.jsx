// src/components/ManageCategoriesBusiness.jsx

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toTitleCase } from "../utils";

import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Grid,
  Card,
  CardActionArea,
  Divider,
} from "@mui/material";

import CategoryIcon from "@mui/icons-material/Category";
import InventoryIcon from "@mui/icons-material/Inventory";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const API_BASE_URL = import.meta.env.VITE_API_URL || API;

function ManageCategoriesBusiness() {
  const navigate = useNavigate();
  const { serviceId } = useParams();

  const [categories, setCategories] = useState([]);
  const [serviceName, setServiceName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchServiceAndCategories = async () => {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("access_token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        // 1) servicio (lectura permitida para business_admin)
        const sRes = await fetch(
          `${API_BASE_URL}/services/${serviceId}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const sData = await sRes.json().catch(() => ({}));
        if (!sRes.ok) {
          throw new Error(
            sData.message || `Error ${sRes.status} al cargar el servicio.`,
          );
        }

        setServiceName(toTitleCase(sData.name || ""));

        // 2) categorías del servicio
        const cRes = await fetch(
          `${API_BASE_URL}/services/${serviceId}/categories`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const cData = await cRes.json().catch(() => ({}));
        if (!cRes.ok) {
          throw new Error(
            cData.message || `Error ${cRes.status} al cargar categorías.`,
          );
        }

        setCategories(
          (cData.categories || []).map((cat) => ({
            ...cat,
            name: toTitleCase(cat.name),
          })),
        );
      } catch (err) {
        setError(err.message || "Error inesperado.");
      } finally {
        setLoading(false);
      }
    };

    fetchServiceAndCategories();
  }, [serviceId, navigate]);

  if (loading) {
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
        <Typography variant="h6">Cargando categorías...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, width: "100%" }}>
      <Paper elevation={3} sx={{ p: 3 }}>

        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <CategoryIcon color="primary" />
            <Typography variant="h5" fontWeight="bold">
              Categorías — <span style={{ color: "#1976d2" }}>{serviceName || `Servicio ${serviceId}`}</span>
            </Typography>
          </Box>
          <Button variant="outlined" startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/manage-services-business")}>
            Volver a Servicios
          </Button>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {!!error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Selecciona una categoría para administrar sus artículos.
        </Typography>

        {categories.length > 0 ? (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 1.5 }}>
            {categories.map((category) => (
              <Card key={category.id} elevation={2} sx={{
                transition: "transform 0.15s, box-shadow 0.15s",
                "&:hover": { transform: "translateY(-3px)", boxShadow: 6 },
              }}>
                <CardActionArea
                  onClick={() => navigate(`/manage-items-business/${category.id}`)}
                  sx={{ p: 2, display: "flex", flexDirection: "column", alignItems: "flex-start" }}
                >
                  <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                    <InventoryIcon color="primary" fontSize="small" />
                    <Typography variant="body2" fontWeight="bold" noWrap>{category.name}</Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">Ver artículos →</Typography>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        ) : (
          <Alert severity="info" variant="outlined">
            No hay categorías asociadas a este servicio.
          </Alert>
        )}
      </Paper>
    </Box>
  );
}

export default ManageCategoriesBusiness;
