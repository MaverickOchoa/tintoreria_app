// src/components/EditService.jsx

import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toTitleCase } from "../utils";

import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Paper,
} from "@mui/material";

import SaveIcon from "@mui/icons-material/Save";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FolderIcon from "@mui/icons-material/Folder";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

function EditService() {
  const { serviceId } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const fetchService = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("access_token");
        if (!token) throw new Error("No se encontró el token de acceso.");

        const response = await fetch(
          `${API_BASE_URL}/services/${serviceId}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Error al cargar el servicio.");
        }

        // backend puede devolver {service:{name}} o {name}
        const rawName = data?.service?.name || data?.name || "";
        setName(toTitleCase(rawName));
      } catch (err) {
        setError(err.message || "Error desconocido al cargar servicio.");
      } finally {
        setLoading(false);
      }
    };

    fetchService();
  }, [serviceId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError(null);
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No se encontró el token de acceso.");

      const newName = name.trim();
      if (!newName) throw new Error("El nombre no puede estar vacío.");

      const response = await fetch(
        `${API_BASE_URL}/services/${serviceId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: newName }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error("Ya existe un servicio con ese nombre.");
        }
        throw new Error(data.message || "Error al actualizar el servicio.");
      }

      setMessage("Servicio actualizado exitosamente!");
      timeoutRef.current = setTimeout(() => {
        navigate("/manage-services");
      }, 1200);
    } catch (err) {
      setError(err.message || "Error desconocido al actualizar servicio.");
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <CircularProgress sx={{ mr: 2 }} />
        <Typography variant="h6">Cargando servicio...</Typography>
      </Box>
    );
  }

  if (error && !name) {
    return (
      <Container maxWidth="sm" sx={{ mt: 5 }}>
        <Alert severity="error">Error al cargar: {error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 5, mb: 5 }}>
      <Paper elevation={4} sx={{ p: 4, borderRadius: 2 }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          align="center"
          sx={{ mb: 3, color: "primary.main", fontWeight: 700 }}
        >
          Editar Servicio
        </Typography>

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

        <Button
          type="button"
          variant="outlined"
          color="secondary"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/manage-services")}
          disabled={isSubmitting}
          sx={{ mb: 3, width: "100%" }}
        >
          Volver a Servicios
        </Button>

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <TextField
              fullWidth
              label="Nuevo Nombre del Servicio"
              type="text"
              value={name}
              onChange={(e) => setName(toTitleCase(e.target.value))}
              required
              variant="outlined"
              disabled={isSubmitting}
              InputProps={{
                startAdornment: <FolderIcon color="action" sx={{ mr: 1 }} />,
              }}
            />

            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmitting || !name.trim()}
              startIcon={
                isSubmitting ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <SaveIcon />
                )
              }
              sx={{ width: "100%", mt: 2 }}
            >
              {isSubmitting ? "Guardando..." : "Actualizar Servicio"}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
}

export default EditService;
