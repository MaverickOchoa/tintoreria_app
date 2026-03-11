// src/components/BranchManagerDashboard.jsx

import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Button, Paper, Stack } from "@mui/material";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import LogoutIcon from "@mui/icons-material/Logout";
import StoreIcon from "@mui/icons-material/Store";
import OrderStatsCards from "./OrderStatsCards";

function BranchManagerDashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("role");
    localStorage.removeItem("business_id");
    localStorage.removeItem("branch_id");
    localStorage.removeItem("user_claims");
    navigate("/login");
  };

  const handleGoOperationalPanel = () => {
    // En tu App.jsx, /manager-panel redirige a /clients dentro del layout
    navigate("/manager-panel");
  };

  const handleChangeBranch = () => {
    // Si más adelante el branch-manager podrá cambiar sucursal, aquí lo mandas a tu selector.
    // Por ahora, tú dijiste que NO entra a branch selector directo, entra al dashboard.
    // Entonces esto puede quedar como “placeholder” o lo puedes ocultar.
    navigate("/select-branch");
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        p: 2,
        bgcolor: "background.default",
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 5,
          borderRadius: 3,
          width: "100%",
          maxWidth: 550,
          textAlign: "center",
        }}
      >
        <Typography
          variant="h5"
          sx={{ mb: 1.5, color: "primary.main", fontWeight: 800 }}
        >
          Panel del Gerente
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Entra a operaciones diarias de tu sucursal.
        </Typography>

        {/* OPERACIONES */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" align="left" sx={{ mb: 2, color: "text.secondary", fontWeight: 600 }}>
            Resumen de Órdenes
          </Typography>
          <OrderStatsCards />
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography
            variant="subtitle1"
            align="left"
            sx={{ mb: 1, color: "text.primary", fontWeight: 600 }}
          >
            Operaciones Diarias
          </Typography>

          <Button
            variant="contained"
            color="primary"
            onClick={handleGoOperationalPanel}
            startIcon={<ViewModuleIcon />}
            size="large"
            sx={{ width: "100%", py: 1.5 }}
          >
            Ir al Panel Operativo
          </Button>
        </Box>

        {/* NAVEGACIÓN SECUNDARIA */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="center"
          sx={{ pt: 2, borderTop: "1px solid #eee" }}
        >
          <Button
            variant="text"
            color="error"
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
          >
            Cerrar Sesión
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

export default BranchManagerDashboard;
