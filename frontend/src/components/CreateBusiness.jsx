import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  useTheme,
  MenuItem,
  Chip,
} from "@mui/material";

import AddBusinessIcon from "@mui/icons-material/AddBusiness";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import StorefrontIcon from "@mui/icons-material/Storefront";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";

import { toTitleCase } from "../utils";

const API_BASE_URL = import.meta.env.VITE_API_URL || API;

function CreateBusiness() {
  const [businessName, setBusinessName] = useState("");
  const [branchName, setBranchName] = useState("Matriz");
  const [branchAddress, setBranchAddress] = useState("");
  const [verticalType, setVerticalType] = useState("laundry");

  const [ownerUsername, setOwnerUsername] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");

  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const theme = useTheme();

  const handleCreateBusiness = async (e) => {
    e.preventDefault();
    setSuccessMessage("");
    setError(null);
    setIsLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      if (!token)
        throw new Error(
          "No hay token. Inicia sesión otra vez como Super Admin."
        );

      const payload = {
        business_name: (businessName || "").trim(),
        admin_username: (ownerUsername || "").trim(),
        admin_password: ownerPassword,
        business_address: (branchAddress || "").trim(),
        vertical_type: verticalType,
      };

      if (!payload.business_name || !payload.admin_username || !payload.admin_password) {
        throw new Error(
          "Faltan campos requeridos: nombre del negocio, usuario y contraseña."
        );
      }

      const res = await fetch(`${API_BASE_URL}/register_business`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // backend manda {"message": "...", "error": "..."} en 500
        const detail = data?.error ? ` | ${data.error}` : "";
        throw new Error(
          (data?.message || "Error al crear el negocio.") + detail
        );
      }

      const displayName = data?.business?.name || payload.name;
      setSuccessMessage(`✅ Negocio '${displayName}' creado exitosamente.`);

      // limpiar
      setBusinessName("");
      setBranchName("Matriz");
      setBranchAddress("");
      setOwnerUsername("");
      setOwnerPassword("");
    } catch (err) {
      setError(err.message || "Error inesperado.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Button
        variant="outlined"
        color="secondary"
        onClick={() => navigate("/super-admin-dashboard")}
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 3 }}
      >
        Volver al Panel
      </Button>

      <Paper elevation={4} sx={{ p: 4, borderRadius: 2 }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          align="center"
          sx={{ mb: 1, color: "primary.main", fontWeight: 700 }}
        >
          Crear Nuevo Negocio
        </Typography>

        <Typography
          variant="subtitle1"
          align="center"
          color="text.secondary"
          sx={{ mb: 4 }}
        >
          Esto crea: Negocio + Dueño (Business Admin) + Sucursal principal
          (atomic).
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

        <form onSubmit={handleCreateBusiness}>
          <Typography
            variant="h6"
            sx={{
              color: "secondary.main",
              mb: 2,
              borderBottom: `1px solid ${theme.palette.divider}`,
              pb: 1,
            }}
          >
            Datos del Negocio
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Tipo de vertical */}
            <Box>
              <Typography fontSize={12} color="text.secondary" fontWeight={600} mb={1}>
                Tipo de Negocio
              </Typography>
              <Box sx={{ display: "flex", gap: 1.5 }}>
                {[
                  { value: "laundry", label: "Tintorería", icon: <StorefrontIcon fontSize="small" />, color: "#4361ee" },
                  { value: "clinic",  label: "Clínica",    icon: <LocalHospitalIcon fontSize="small" />, color: "#2ec4b6" },
                ].map(opt => (
                  <Box
                    key={opt.value}
                    onClick={() => setVerticalType(opt.value)}
                    sx={{
                      flex: 1, border: `2px solid ${verticalType === opt.value ? opt.color : "#e0e0e0"}`,
                      borderRadius: 2, p: 1.5, cursor: "pointer", textAlign: "center",
                      bgcolor: verticalType === opt.value ? opt.color + "10" : "#fff",
                      transition: "all 0.15s",
                    }}
                  >
                    <Box sx={{ color: opt.color, mb: 0.5 }}>{opt.icon}</Box>
                    <Typography fontSize={13} fontWeight={verticalType === opt.value ? 700 : 400} color={verticalType === opt.value ? opt.color : "text.secondary"}>
                      {opt.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            <TextField
              fullWidth
              label="Nombre del Negocio"
              value={businessName}
              onChange={(e) => setBusinessName(toTitleCase(e.target.value))}
              required
              size="small"
            />

            <TextField
              fullWidth
              label="Nombre de la Sucursal Principal"
              value={branchName}
              onChange={(e) => setBranchName(toTitleCase(e.target.value))}
              size="small"
            />

            <TextField
              fullWidth
              label="Dirección de la Sucursal Principal"
              value={branchAddress}
              onChange={(e) => setBranchAddress(toTitleCase(e.target.value))}
              size="small"
            />
          </Box>

          <Divider sx={{ my: 4 }} />

          <Typography
            variant="h6"
            sx={{
              color: "secondary.main",
              mb: 2,
              borderBottom: `1px solid ${theme.palette.divider}`,
              pb: 1,
            }}
          >
            Credenciales del Dueño (Business Admin)
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3 }}>
            <TextField
              fullWidth
              label="Username del Dueño"
              value={ownerUsername}
              onChange={(e) => setOwnerUsername(e.target.value)}
              required
              size="small"
            />

            <TextField
              fullWidth
              label="Password del Dueño"
              type="password"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              required
              size="small"
            />
          </Box>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isLoading}
            startIcon={
              isLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <AddBusinessIcon />
              )
            }
            sx={{ width: "100%", mt: 2, py: 1.2 }}
          >
            Crear Negocio
          </Button>
        </form>
      </Paper>
    </Container>
  );
}

export default CreateBusiness;
