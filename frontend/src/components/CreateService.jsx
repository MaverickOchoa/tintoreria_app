// src/components/CreateService.jsx

import React, { useState, useRef, useEffect } from "react";
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
  TextField,
} from "@mui/material";

import HomeRepairServiceIcon from "@mui/icons-material/HomeRepairService";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";

import { toTitleCase } from "../utils";

const API_BASE_URL = import.meta.env.VITE_API_URL || API;

function CreateService() {
  const navigate = useNavigate();
  const [serviceName, setServiceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");

  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCreateService = async (e) => {
    e.preventDefault();
    setMessage("");
    setError(null);

    const nameTrimmed = serviceName.trim();
    if (!nameTrimmed) {
      setError("El nombre del servicio no puede estar vacío.");
      return;
    }

    const formattedName = toTitleCase(nameTrimmed);

    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/services`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: formattedName }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(`El servicio "${formattedName}" ya existe.`);
        }
        throw new Error(data.message || "Error al crear el servicio.");
      }

      // backend puede devolver {service:{...}} o algo distinto
      const savedName = data?.service?.name || data?.name || formattedName;

      setMessage(`¡Servicio "${savedName}" creado exitosamente!`);
      setServiceName("");

      timeoutRef.current = setTimeout(() => {
        navigate("/manage-services");
      }, 1200);
    } catch (err) {
      setError(err.message || "Error desconocido al crear servicio.");
    } finally {
      setLoading(false);
    }
  };

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
          Crear Nuevo Servicio
        </Typography>

        <Typography
          variant="body1"
          align="center"
          color="text.secondary"
          sx={{ mb: 3 }}
        >
          Ingresa el nombre del nuevo servicio global.
        </Typography>

        <Divider sx={{ mb: 3 }} />

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

        <Box component="form" onSubmit={handleCreateService}>
          <TextField
            label="Nombre del Servicio"
            variant="outlined"
            fullWidth
            required
            value={serviceName}
            onChange={(e) => setServiceName(toTitleCase(e.target.value))}
            margin="normal"
            disabled={loading}
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            startIcon={
              loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
            disabled={loading || !serviceName.trim()}
            fullWidth
            sx={{ mt: 3, py: 1.5 }}
          >
            {loading ? "Creando..." : "Guardar Servicio"}
          </Button>
        </Box>

        <Divider sx={{ mt: 3, mb: 2 }} />

        <Button
          variant="outlined"
          color="secondary"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/manage-services")}
          fullWidth
        >
          Volver a Administrar Servicios
        </Button>
      </Paper>
    </Container>
  );
}

export default CreateService;
