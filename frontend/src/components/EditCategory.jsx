// src/components/EditCategory.jsx

import React, { useEffect, useMemo, useState } from "react";
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
  Stack,
} from "@mui/material";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import CategoryIcon from "@mui/icons-material/Category";

import { toTitleCase } from "../utils";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

export default function EditCategory() {
  const { categoryId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [serviceId, setServiceId] = useState(null);
  const [name, setName] = useState("");

  const token = useMemo(() => localStorage.getItem("access_token"), []);
  const headers = useMemo(() => {
    if (!token) return null;
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }, [token]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      setMessage("");

      try {
        const res = await fetch(
          `${API_BASE_URL}/categories/${categoryId}`,
          {
            method: "GET",
            headers,
          },
        );

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            data.message || `Error ${res.status} al cargar categoría.`,
          );
        }

        setServiceId(data.service_id ?? null);
        setName(toTitleCase(data.name || ""));
      } catch (e) {
        setError(e.message || "Error al cargar categoría.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [categoryId, headers]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const clean = name.trim();
      if (!clean) throw new Error("El nombre no puede ir vacío.");

      const res = await fetch(
        `${API_BASE_URL}/categories/${categoryId}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({ name: clean }),
        },
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(
            "Ya existe una categoría con ese nombre en este servicio.",
          );
        }
        throw new Error(
          data.message || `Error ${res.status} al guardar categoría.`,
        );
      }

      setMessage("✅ Categoría actualizada.");
      setTimeout(() => {
        if (serviceId) navigate(`/manage-categories/${serviceId}`);
        else navigate("/manage-services");
      }, 900);
    } catch (e2) {
      setError(e2.message || "Error al guardar categoría.");
      setSaving(false);
    }
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
        <CircularProgress sx={{ mr: 2 }} />
        <Typography variant="h6">Cargando categoría...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 6 }}>
      <Paper elevation={6} sx={{ p: 4 }}>
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<ArrowBackIcon />}
            onClick={() => {
              if (serviceId) navigate(`/manage-categories/${serviceId}`);
              else navigate("/manage-services");
            }}
            disabled={saving}
          >
            Volver
          </Button>
          <Box sx={{ flex: 1 }} />
        </Stack>

        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }} align="center">
          <CategoryIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          Editar Categoría
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2 }}
          align="center"
        >
          Categoría ID: {categoryId}{" "}
          {serviceId ? `• Servicio ID: ${serviceId}` : ""}
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

        <Box component="form" onSubmit={handleSave}>
          <TextField
            label="Nombre"
            fullWidth
            required
            value={name}
            onChange={(e) => setName(toTitleCase(e.target.value))}
            disabled={saving}
          />

          <Button
            type="submit"
            variant="contained"
            startIcon={
              saving ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
            disabled={saving || !name.trim()}
            sx={{ width: "100%", mt: 2, py: 1.2 }}
          >
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
