// src/components/EditItemBranchPrice.jsx

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
  Divider,
} from "@mui/material";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

const CAN_MANAGE_ITEMS_ROLES = new Set([
  "business_admin",
  "business_manager",
  "manager",
  "gerente",
  "branch_manager",
]);

const getAuthClaims = () => {
  const claimsString = localStorage.getItem("user_claims");
  if (!claimsString)
    return { role: null, branch_id: null, active_branch_id: null };
  try {
    const claims = JSON.parse(claimsString);
    return {
      role: claims.role || null,
      branch_id: claims.branch_id ?? null,
      active_branch_id: claims.active_branch_id ?? null,
    };
  } catch {
    return { role: null, branch_id: null, active_branch_id: null };
  }
};

export default function EditItemBranchPrice() {
  const { itemId } = useParams();
  const navigate = useNavigate();

  const claims = useMemo(() => getAuthClaims(), []);
  const role = claims.role;
  const activeBranchId = claims.active_branch_id ?? claims.branch_id ?? null;

  const token = useMemo(() => localStorage.getItem("access_token"), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [itemName, setItemName] = useState("");
  const [basePrice, setBasePrice] = useState(null);

  const [overridePrice, setOverridePrice] = useState("");
  const [hasOverride, setHasOverride] = useState(false);

  useEffect(() => {
    if (!role || !CAN_MANAGE_ITEMS_ROLES.has(role)) {
      navigate("/login");
    }
  }, [role, navigate]);

  useEffect(() => {
    const boot = async () => {
      setLoading(true);
      setError("");
      setSuccess("");

      if (!token) {
        setError("Sesión no válida. Inicia sesión de nuevo.");
        setLoading(false);
        navigate("/login");
        return;
      }

      if (!activeBranchId) {
        setError(
          "No hay sucursal activa seleccionada. Ve a seleccionar sucursal primero.",
        );
        setLoading(false);
        return;
      }

      try {
        // 1) Item base
        const itemRes = await fetch(`${API_BASE_URL}/items/${itemId}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        const itemData = await itemRes.json().catch(() => ({}));
        if (!itemRes.ok)
          throw new Error(itemData.message || "Error al cargar el artículo.");

        const item = itemData.item || itemData;
        setItemName(toTitleCase(item.name || ""));
        setBasePrice(item.price ?? null);

        // 2) Override
        const ovRes = await fetch(
          `${API_BASE_URL}/api/v1/branch-item-overrides/branch/${activeBranchId}/item/${itemId}`,
          { method: "GET", headers: { Authorization: `Bearer ${token}` } },
        );

        if (ovRes.status === 404) {
          setHasOverride(false);
          setOverridePrice("");
        } else {
          const ovData = await ovRes.json().catch(() => ({}));
          if (ovRes.ok) {
            const val = ovData?.override?.price_override ?? "";
            setHasOverride(true);
            setOverridePrice(String(val));
          } else {
            // si falla, no nos morimos; lo tratamos como no override
            setHasOverride(false);
            setOverridePrice("");
          }
        }
      } catch (err) {
        setError(err.message || "Error al cargar datos.");
      } finally {
        setLoading(false);
      }
    };

    boot();
  }, [itemId, token, activeBranchId, navigate]);

  const goBack = () => navigate(-1);

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    if (!token) {
      setError("Sesión no válida. Inicia sesión de nuevo.");
      setSaving(false);
      navigate("/login");
      return;
    }

    if (!activeBranchId) {
      setError("No hay sucursal activa seleccionada.");
      setSaving(false);
      return;
    }

    const raw = String(overridePrice ?? "").trim();
    if (!raw) {
      setError("El precio por sucursal es requerido.");
      setSaving(false);
      return;
    }

    const num = parseFloat(raw);
    if (Number.isNaN(num)) {
      setError("El precio debe ser un número válido.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/branch-item-overrides/branch/${activeBranchId}/item/${itemId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ price_override: num }),
        },
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data.message || "Error al guardar override.");

      setHasOverride(true);
      setSuccess("Precio por sucursal guardado.");
      setTimeout(() => goBack(), 650);
    } catch (err) {
      setError(err.message || "Error al guardar override.");
      setSaving(false);
    }
  };

  const handleDeleteOverride = async () => {
    const ok = window.confirm(
      "¿Eliminar el override de precio para esta sucursal?",
    );
    if (!ok) return;

    setError("");
    setSuccess("");
    setSaving(true);

    if (!token) {
      setError("Sesión no válida. Inicia sesión de nuevo.");
      setSaving(false);
      navigate("/login");
      return;
    }

    if (!activeBranchId) {
      setError("No hay sucursal activa seleccionada.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/branch-item-overrides/branch/${activeBranchId}/item/${itemId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 404) {
        throw new Error(data.message || "Error al eliminar override.");
      }

      setHasOverride(false);
      setOverridePrice("");
      setSuccess("Override eliminado. Volviendo a precio base.");
      setTimeout(() => goBack(), 650);
    } catch (err) {
      setError(err.message || "Error al eliminar override.");
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
          minHeight: "80vh",
        }}
      >
        <CircularProgress sx={{ mr: 2 }} />
        <Typography variant="h6">Cargando...</Typography>
      </Box>
    );
  }

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
            Precio por Sucursal
          </Typography>

          <Typography
            variant="subtitle1"
            align="center"
            color="text.secondary"
            sx={{ mb: 2 }}
          >
            Item:{" "}
            <Typography
              component="span"
              sx={{ fontWeight: 800, color: "text.primary" }}
            >
              {itemName || `(ID: ${itemId})`}
            </Typography>
          </Typography>

          <Typography
            variant="body2"
            align="center"
            color="text.secondary"
            sx={{ mb: 2 }}
          >
            Sucursal activa: <b>{activeBranchId}</b>
          </Typography>

          <Divider sx={{ mb: 2 }} />

          {!!success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          {!!error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
            Precio base (negocio):{" "}
            <b>
              {basePrice !== null && basePrice !== undefined
                ? `$${parseFloat(basePrice).toFixed(2)}`
                : "N/A"}
            </b>
          </Alert>

          <Button
            type="button"
            variant="outlined"
            color="secondary"
            startIcon={<ArrowBackIcon />}
            onClick={goBack}
            disabled={saving}
            sx={{ mb: 2, width: "100%" }}
          >
            Volver
          </Button>

          <form onSubmit={handleSave}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                fullWidth
                label="Precio por sucursal (override)"
                type="number"
                inputProps={{ step: "0.01" }}
                value={overridePrice}
                onChange={(e) => setOverridePrice(e.target.value)}
                disabled={saving}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoneyIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                helperText={
                  hasOverride
                    ? "Ya existe override. Puedes actualizarlo."
                    : "No hay override. Al guardar se crea."
                }
              />

              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={saving || !String(overridePrice).trim()}
                startIcon={
                  saving ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <SaveIcon />
                  )
                }
                sx={{ width: "100%" }}
              >
                {saving ? "Guardando..." : "Guardar Precio por Sucursal"}
              </Button>

              <Button
                type="button"
                variant="outlined"
                color="error"
                disabled={saving || !hasOverride}
                onClick={handleDeleteOverride}
                startIcon={<DeleteIcon />}
                sx={{ width: "100%" }}
              >
                Eliminar Override (volver a precio base)
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
}
