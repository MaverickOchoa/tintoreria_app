// src/components/SuperAdminDashboard.jsx

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
  Divider,
} from "@mui/material";

// Íconos
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import BusinessIcon from "@mui/icons-material/Business";
import HomeRepairServiceIcon from "@mui/icons-material/HomeRepairService";
import PaletteIcon from "@mui/icons-material/Palette";
import LogoutIcon from "@mui/icons-material/Logout";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import StorageIcon from "@mui/icons-material/Storage";

import CreateBranchForm from "./CreateBranchForm";
import { toTitleCase } from "../utils";

const API_BASE_URL = import.meta.env.VITE_API_URL || API;

// ✅ YA EXISTE services en backend_new -> lo activamos
const ENABLE_SERVICES = true;

// Botones
const dashboardActions = [
  {
    label: "Crear Nuevo Negocio",
    path: "/create-business",
    icon: <BusinessIcon />,
    variant: "contained",
    color: "primary",
    enabled: true,
  },
  {
    label: "Administrar Negocios",
    path: "/manage-businesses",
    icon: <StorageIcon />,
    variant: "outlined",
    color: "secondary",
    enabled: true,
  },
  {
    label: "Administrar Servicios",
    path: "/manage-services",
    icon: <HomeRepairServiceIcon />,
    variant: "outlined",
    color: "secondary",
    enabled: ENABLE_SERVICES,
  },
  {
    label: "Gestión de Detalles",
    path: "/manage-details",
    icon: <PaletteIcon />,
    variant: "outlined",
    color: "secondary",
    enabled: true,
  },
  {
    label: "Gestión de Agencias",
    path: "/manage-agencies",
    icon: <BusinessIcon />,
    variant: "outlined",
    color: "secondary",
    enabled: true,
  },
];

function SuperAdminDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [showCreateBranchForm, setShowCreateBranchForm] = useState(false);
  const [businessList, setBusinessList] = useState([]);

  const fetchDashboardData = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError("No se encontró el token de acceso. Redirigiendo al login.");
        navigate("/login");
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // ✅ Traer negocios desde backend_new
      const businessResponse = await fetch(
        `${API_BASE_URL}/businesses`,
        {
          method: "GET",
          headers,
        },
      );

      const businessListData = await businessResponse.json().catch(() => ({}));
      if (!businessResponse.ok) {
        throw new Error(
          businessListData.message ||
            `Error ${businessResponse.status} al cargar negocios.`,
        );
      }

      setBusinessList(
        (businessListData.businesses || []).map((b) => ({
          ...b,
          name: toTitleCase(b.name),
        })),
      );
    } catch (err) {
      setError(err.message || "Error desconocido al cargar el dashboard.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_claims");
    localStorage.removeItem("business_id");
    navigate("/login");
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
          Cargando Panel...
        </Typography>
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
        justifyContent: "center",
        minHeight: "60vh",
      }}
    >
      <Paper elevation={6} sx={{ p: 4, width: "100%" }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          align="center"
          sx={{ mb: 3, color: "primary.main", fontWeight: 700 }}
        >
          <AdminPanelSettingsIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          Panel de Super Administrador
        </Typography>

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* ✅ Mensaje corregido: servicios ya está migrado */}
        {ENABLE_SERVICES && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Servicios ya está activo en backend_new ✅
          </Alert>
        )}

        <Divider sx={{ mb: 3 }} />

        <Typography
          variant="h6"
          gutterBottom
          sx={{ color: "text.secondary", textAlign: "center" }}
        >
          Acciones de Gestión
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 4 }}>
          {dashboardActions
            .filter((a) => a.enabled)
            .map((action) => (
              <Button
                key={action.path}
                variant={action.variant}
                color={action.color}
                fullWidth
                startIcon={action.icon}
                onClick={() => navigate(action.path)}
                sx={{ py: 1.5, justifyContent: "flex-start" }}
              >
                {action.label}
              </Button>
            ))}

          <Button
            variant="text"
            color="secondary"
            fullWidth
            startIcon={<AddCircleOutlineIcon />}
            onClick={() => setShowCreateBranchForm(!showCreateBranchForm)}
            sx={{ py: 1.5, justifyContent: "flex-start", mt: 1 }}
          >
            {showCreateBranchForm
              ? "Ocultar Formulario de Sucursal"
              : "Crear Nueva Sucursal"}
          </Button>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {showCreateBranchForm && (
          <Box
            sx={{
              mt: 2,
              p: 3,
              border: "1px dashed #ccc",
              borderRadius: 1,
              mb: 4,
            }}
          >
            <Typography variant="h6" gutterBottom color="primary">
              Formulario de Nueva Sucursal
            </Typography>

            <CreateBranchForm
              businessList={businessList}
              toTitleCase={toTitleCase}
            />
          </Box>
        )}

        <Divider sx={{ mt: 4, mb: 2 }} />

        <Button
          variant="contained"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          fullWidth
          sx={{ py: 1.5 }}
        >
          Cerrar Sesión
        </Button>
      </Paper>
    </Container>
  );
}

export default SuperAdminDashboard;
