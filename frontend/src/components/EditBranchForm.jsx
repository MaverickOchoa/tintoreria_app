// src/components/EditBranch.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Divider,
  TextField,
  Stack,
} from "@mui/material";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";

import { toTitleCase } from "../utils";

const API_BASE_URL = import.meta.env.VITE_API_URL || API;

export default function EditBranch() {
  const { branchId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [businessId, setBusinessId] = useState(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

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
      setError("");
      setMessage("");
      setLoading(true);

      try {
        if (!headers) {
          setError("No hay sesión activa. Vuelve a iniciar sesión.");
          navigate("/login");
          return;
        }

        const res = await fetch(`${API_BASE_URL}/branches/${branchId}`, {
          method: "GET",
          headers,
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            data.message || `Error ${res.status} al cargar sucursal.`,
          );
        }

        setBusinessId(data.business_id ?? null);
        setName(toTitleCase(data.name || ""));
        setAddress(data.address ? toTitleCase(data.address) : "");
      } catch (e) {
        setError(e.message || "Error al cargar sucursal.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [branchId, headers, navigate]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const cleanName = name.trim();
      const cleanAddress = address.trim();

      if (!cleanName) throw new Error("El nombre de la sucursal es requerido.");

      const res = await fetch(`${API_BASE_URL}/branches/${branchId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: cleanName,
          address: cleanAddress,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.message || `Error ${res.status} al guardar sucursal.`,
        );
      }

      setMessage("✅ Sucursal actualizada.");
      setTimeout(() => navigate("/manage-businesses"), 900);
    } catch (e2) {
      setError(e2.message || "Error al guardar sucursal.");
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
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Cargando sucursal...
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 6 }}>
      <Paper elevation={6} sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/manage-businesses")}
            disabled={saving}
          >
            Volver
          </Button>
          <Box sx={{ flex: 1 }} />
        </Stack>

        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Editar Sucursal
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Sucursal ID: {branchId}{" "}
          {businessId ? `• Negocio ID: ${businessId}` : ""}
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
            fullWidth
            label="Nombre de la Sucursal"
            value={name}
            onChange={(e) => setName(toTitleCase(e.target.value))}
            disabled={saving}
            required
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Dirección"
            value={address}
            onChange={(e) => setAddress(toTitleCase(e.target.value))}
            disabled={saving}
            sx={{ mb: 2 }}
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
            sx={{ mt: 1, width: "100%", py: 1.2 }}
          >
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
