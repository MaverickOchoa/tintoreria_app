// src/components/CreateCategory.jsx

import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

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

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import CategoryIcon from "@mui/icons-material/Category";

import { toTitleCase } from "../utils";

const API_BASE_URL = import.meta.env.VITE_API_URL || API;

export default function CreateCategory() {
  const { serviceId } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const token = useMemo(() => localStorage.getItem("access_token"), []);
  const headers = useMemo(() => {
    if (!token) return null;
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const clean = name.trim();
      if (!clean) throw new Error("El nombre no puede ir vacío.");

      const res = await fetch(
        `${API_BASE_URL}/services/${serviceId}/categories`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ name: clean }),
        },
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error("Esa categoría ya existe en este servicio.");
        }
        throw new Error(
          data.message || `Error ${res.status} al crear categoría.`,
        );
      }

      setMessage("✅ Categoría creada.");
      setName("");
      setTimeout(() => navigate(`/manage-categories/${serviceId}`), 900);
    } catch (e2) {
      setError(e2.message || "Error al crear categoría.");
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 6 }}>
      <Paper elevation={6} sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }} align="center">
          <CategoryIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          Crear Categoría
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2 }}
          align="center"
        >
          Servicio ID: {serviceId}
        </Typography>

        <Divider sx={{ mb: 2 }} />

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

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="Nombre de la Categoría"
            fullWidth
            required
            value={name}
            onChange={(e) => setName(toTitleCase(e.target.value))}
            disabled={loading}
          />

          <Button
            type="submit"
            variant="contained"
            startIcon={
              loading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
            disabled={loading || !name.trim()}
            sx={{ width: "100%", mt: 2, py: 1.2 }}
          >
            {loading ? "Creando..." : "Guardar"}
          </Button>

          <Button
            type="button"
            variant="outlined"
            color="secondary"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/manage-categories/${serviceId}`)}
            disabled={loading}
            sx={{ width: "100%", mt: 2 }}
          >
            Volver
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
