import React, { useState } from "react";
// 🚨 Importar componentes de MUI necesarios
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  useTheme,
} from "@mui/material";
import AddBusinessIcon from "@mui/icons-material/AddBusiness";
import WarningIcon from "@mui/icons-material/Warning";

// ✅ Backend_new base
const API_BASE_URL = import.meta.env.VITE_API_URL || API;

// 🔑 Recibimos toTitleCase en las props
const CreateBranchForm = ({ businessList, toTitleCase }) => {
  const theme = useTheme();

  const [businessId, setBusinessId] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setIsLoading(true);

    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      setError("No tienes sesión activa. Por favor, inicia sesión de nuevo.");
      setIsLoading(false);
      return;
    }

    if (!businessId || !branchName || !branchAddress) {
      setError("Todos los campos son obligatorios.");
      setIsLoading(false);
      return;
    }

    try {
      // ✅ Endpoint real en backend_new
      // POST /api/v1/branches/business/<business_id>
      const url = `${API_BASE_URL}/businesses/${businessId}/branches`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: branchName,
          address: branchAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al crear la sucursal.");
      }

      if (data.branch && data.branch.name && data.branch.id) {
        setMessage(
          `✅ Sucursal '${data.branch.name}' (ID: ${data.branch.id}) creada para el Negocio ID ${businessId}.`
        );
      } else {
        setMessage(
          data.message ||
            "Sucursal creada exitosamente, pero el detalle no fue devuelto por el servidor."
        );
      }

      // Limpiar formulario
      setBusinessId("");
      setBranchName("");
      setBranchAddress("");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // 🚨 Box como contenedor principal 'form-section'
    <Box
      component="section"
      sx={{
        p: 3,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        bgcolor: "background.paper",
      }}
    >
      {/* 🚨 Título y subtítulo */}
      <Typography
        variant="h5"
        component="h3"
        gutterBottom
        sx={{ mb: 1.5, color: "primary.main", fontWeight: 600 }}
      >
        Crear Nueva Sucursal
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Asigna una sucursal a un negocio existente (solo Super Admin).
      </Typography>

      {/* 🚨 Mensajes de Feedback */}
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

      <form onSubmit={handleSubmit}>
        {/* 🚨 Campo de Selección de Negocio */}
        <FormControl
          fullWidth
          margin="normal"
          size="small"
          required
          sx={{ mb: 2 }}
        >
          <InputLabel id="branch-business-id-label">Negocio</InputLabel>
          <Select
            labelId="branch-business-id-label"
            id="branch-business-id"
            value={businessId}
            label="Negocio"
            onChange={(e) => setBusinessId(e.target.value)}
            disabled={businessList.length === 0}
          >
            <MenuItem value="">
              <em>-- Seleccione un Negocio --</em>
            </MenuItem>
            {businessList.map((business) => (
              <MenuItem key={business.id} value={business.id}>
                {business.name} (ID: {business.id})
              </MenuItem>
            ))}
          </Select>

          {businessList.length === 0 && (
            <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
              <WarningIcon color="warning" sx={{ mr: 0.5, fontSize: 16 }} />
              <Typography variant="caption" color="orange">
                Cargando negocios o no hay negocios.
              </Typography>
            </Box>
          )}
        </FormControl>

        {/* 🚨 Input de Nombre de la Sucursal */}
        <TextField
          fullWidth
          label="Nombre de la Sucursal"
          id="branch-name"
          value={branchName}
          onChange={(e) => setBranchName(toTitleCase(e.target.value))}
          variant="outlined"
          size="small"
          margin="normal"
          required
          sx={{ mb: 2 }}
        />

        {/* 🚨 Input de Dirección */}
        <TextField
          fullWidth
          label="Dirección"
          id="branch-address"
          value={branchAddress}
          onChange={(e) => setBranchAddress(toTitleCase(e.target.value))}
          variant="outlined"
          size="small"
          margin="normal"
          required
          sx={{ mb: 3 }}
        />

        {/* 🚨 Botón de Creación */}
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
          sx={{ width: "100%" }}
        >
          Crear Sucursal
        </Button>
      </form>
    </Box>
  );
};

export default CreateBranchForm;
