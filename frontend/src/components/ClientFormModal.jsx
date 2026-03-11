import React, { useState, useEffect } from "react";
// 🚨 Importar componentes de MUI necesarios
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  useTheme,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";

// Mantenemos la URL base original
const BASE_URL = "http://127.0.0.1:5000/api/v1";

// Eliminamos todos los objetos de estilo nativos (inputStyles, btnPrimary, btnSecondary)

const ClientFormModal = ({ client, onSave, onClose }) => {
  const isEdit = !!client;
  const theme = useTheme();

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    notes: "",
    ...(isEdit ? client : {}),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (client) {
      setFormData(client);
    }
  }, [client]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // 🔑 LÓGICA DE NEGOCIO ORIGINAL MANTENIDA: Usamos "jwt_token"
    const token = localStorage.getItem("jwt_token");
    if (!token) {
      setError("Error de autenticación. Inicia sesión.");
      setIsLoading(false);
      return;
    }

    const url = isEdit
      ? `${BASE_URL}/clients/${client.id}`
      : `${BASE_URL}/clients`;
    const method = isEdit ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          data.message || `Error ${response.status}: ${response.statusText}`;
        setError(errorMessage);
        return;
      }

      onSave(data.client || data);
      onClose();
    } catch (err) {
      setError(`Error de red o servidor: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, width: "100%" }}>
      {/* Título del Formulario con tipografía de Ybarra */}
      <Typography
        variant="h5"
        component="h3"
        gutterBottom
        sx={{ mb: 3, color: "primary.main", fontWeight: 600 }}
      >
        {isEdit ? "Editar Cliente" : "Nuevo Cliente"}
      </Typography>

      {/* Mensaje de Error (Usando Alert de MUI) */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        {/* Input de Nombre Completo */}
        <TextField
          fullWidth
          label="Nombre Completo *"
          name="full_name"
          value={formData.full_name}
          onChange={handleChange}
          variant="outlined"
          size="small"
          margin="dense"
          required
          disabled={isLoading}
          sx={{ mb: 1.5 }}
        />

        {/* Input de Teléfono */}
        <TextField
          fullWidth
          label="Teléfono *"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          variant="outlined"
          size="small"
          margin="dense"
          required
          disabled={isLoading}
          sx={{ mb: 1.5 }}
        />

        {/* Input de Email */}
        <TextField
          fullWidth
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          variant="outlined"
          size="small"
          margin="dense"
          disabled={isLoading}
          sx={{ mb: 1.5 }}
        />

        {/* Textarea de Notas */}
        <TextField
          fullWidth
          label="Notas"
          name="notes"
          multiline
          rows={3}
          value={formData.notes}
          onChange={handleChange}
          variant="outlined"
          size="small"
          margin="dense"
          disabled={isLoading}
          sx={{ mb: 2 }}
        />

        {/* Contenedor de Acciones (Alineación a la Derecha) */}
        <Box
          sx={{ mt: 3, display: "flex", justifyContent: "flex-end", gap: 2 }}
        >
          {/* Botón de Cancelar (Secundario, Outlined) */}
          <Button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            variant="outlined"
            color="secondary"
            startIcon={<CancelIcon />}
          >
            Cancelar
          </Button>

          {/* Botón de Guardar (Principal, Contained) */}
          <Button
            type="submit"
            disabled={isLoading}
            variant="contained"
            color="primary"
            startIcon={
              isLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
          >
            {isEdit ? "Guardar Cambios" : "Crear Cliente"}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default ClientFormModal;
