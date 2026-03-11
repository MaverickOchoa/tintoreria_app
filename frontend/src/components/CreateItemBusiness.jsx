// src/components/CreateItemBusiness.jsx

import React, { useEffect, useMemo, useState } from "react";
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
  InputAdornment,
  FormControlLabel,
  Switch,
  Divider,
} from "@mui/material";

import SaveIcon from "@mui/icons-material/Save";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import InventoryIcon from "@mui/icons-material/Inventory";

const API_BASE_URL = import.meta.env.VITE_API_URL || API;

// ✅ Roles permitidos
const CAN_MANAGE_ITEMS_ROLES = new Set([
  "business_admin",
  "business_manager",
  "manager",
  "gerente",
  "branch_manager",
]);

const getAuthClaims = () => {
  const claimsString = localStorage.getItem("user_claims");
  if (!claimsString) return { role: null, business_id: null };
  try {
    const claims = JSON.parse(claimsString);
    return {
      role: claims.role || null,
      business_id: claims.business_id ?? null,
    };
  } catch {
    return { role: null, business_id: null };
  }
};

export default function CreateItemBusiness() {
  const { categoryId } = useParams();
  const navigate = useNavigate();

  const claims = useMemo(() => getAuthClaims(), []);
  const role = claims.role;

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [isActive, setIsActive] = useState(true);

  // ✅ Mostrar nombre de categoría
  const [loadingCategory, setLoadingCategory] = useState(true);
  const [categoryName, setCategoryName] = useState("");

  const token = useMemo(() => localStorage.getItem("access_token"), []);

  useEffect(() => {
    if (!role || !CAN_MANAGE_ITEMS_ROLES.has(role)) {
      navigate("/login");
    }
  }, [role, navigate]);

  useEffect(() => {
    const fetchCategoryName = async () => {
      setLoadingCategory(true);

      if (!token) {
        setCategoryName(`(ID: ${categoryId})`);
        setLoadingCategory(false);
        return;
      }

      try {
        // ✅ Usamos tu endpoint existente, que ya devuelve category_name
        const res = await fetch(
          `${API_BASE_URL}/categories/${categoryId}/items`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          setCategoryName(
            toTitleCase(data.category_name || `(ID: ${categoryId})`),
          );
        } else {
          setCategoryName(`(ID: ${categoryId})`);
        }
      } catch {
        setCategoryName(`(ID: ${categoryId})`);
      } finally {
        setLoadingCategory(false);
      }
    };

    if (categoryId) fetchCategoryName();
  }, [categoryId, token]);

  const handleGoBack = () => {
    navigate(`/manage-items-business/${categoryId}`);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    if (!token) {
      setError("Sesión no válida. Inicia sesión de nuevo.");
      setIsSubmitting(false);
      navigate("/login");
      return;
    }

    const claims = JSON.parse(localStorage.getItem("user_claims") || "{}");
    const payload = {
      name: toTitleCase(name.trim()),
      price: parseFloat(price),
      is_active: isActive,
      business_id: claims.business_id || undefined,
    };

    if (!payload.name) {
      setError("El nombre no puede estar vacío.");
      setIsSubmitting(false);
      return;
    }

    if (Number.isNaN(payload.price)) {
      setError("El precio debe ser un número válido.");
      setIsSubmitting(false);
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        `${API_BASE_URL}/categories/${categoryId}/items`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(
            "Ya existe un artículo con ese nombre en esta categoría.",
          );
        }
        throw new Error(data.message || "Error al crear el artículo.");
      }

      setSuccessMessage("¡Artículo creado!");
      setTimeout(() => handleGoBack(), 650);
    } catch (err) {
      setError(err.message || "Error al crear el artículo.");
      setIsSubmitting(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
      }}
    >
      <Box sx={{ width: "100%" }}>
        <Paper elevation={4} sx={{ p: 4, borderRadius: 2 }}>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            align="center"
            sx={{ mb: 1, color: "primary.main", fontWeight: 700 }}
          >
            Crear Artículo
          </Typography>

          <Typography
            variant="subtitle1"
            align="center"
            color="text.secondary"
            sx={{ mb: 2 }}
          >
            Categoría:{" "}
            {loadingCategory ? (
              <CircularProgress size={16} sx={{ verticalAlign: "middle" }} />
            ) : (
              <Typography
                component="span"
                sx={{ fontWeight: 700, color: "text.primary" }}
              >
                {categoryName || `(ID: ${categoryId})`}
              </Typography>
            )}
          </Typography>

          <Divider sx={{ mb: 2 }} />

          {!!successMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {successMessage}
            </Alert>
          )}
          {!!error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            type="button"
            variant="outlined"
            color="secondary"
            startIcon={<ArrowBackIcon />}
            onClick={handleGoBack}
            disabled={isSubmitting}
            sx={{ mb: 3, width: "100%" }}
          >
            Volver a Lista de Artículos
          </Button>

          <form onSubmit={handleCreate}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <TextField
                fullWidth
                label="Nombre del Artículo"
                value={name}
                onChange={(e) => setName(toTitleCase(e.target.value))}
                required
                disabled={isSubmitting}
                InputProps={{
                  startAdornment: (
                    <InventoryIcon color="action" sx={{ mr: 1 }} />
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Precio Base (Negocio)"
                type="number"
                inputProps={{ step: "0.01" }}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                disabled={isSubmitting}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoneyIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    disabled={isSubmitting}
                  />
                }
                label={isActive ? "Activo" : "Inactivo"}
              />

              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting || !name.trim() || !price || loading}
                startIcon={
                  isSubmitting || loading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <SaveIcon />
                  )
                }
                sx={{ width: "100%", mt: 1 }}
              >
                {isSubmitting || loading ? "Creando..." : "Crear Artículo"}
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
}
