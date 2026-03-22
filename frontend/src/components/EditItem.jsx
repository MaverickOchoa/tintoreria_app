// src/components/EditItem.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Box,
} from "@mui/material";

const API_BASE_URL = import.meta.env.VITE_API_URL || API;

export default function EditItem() {
  const { itemId, branchId } = useParams();
  const navigate = useNavigate();

  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadOverride = async () => {
      const token = localStorage.getItem("access_token");

      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/branch-item-overrides/branch/${branchId}/item/${itemId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (res.ok) {
          const data = await res.json();
          setPrice(data.price);
        } else {
          // fallback al precio base
          const baseRes = await fetch(
            `${API_BASE_URL}/items/${itemId}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          const baseData = await baseRes.json();
          setPrice(baseData.price);
        }
      } catch (err) {
        setError("Error cargando precio");
      } finally {
        setLoading(false);
      }
    };

    loadOverride();
  }, [branchId, itemId]);

  const handleSave = async () => {
    setSaving(true);
    setError("");

    const token = localStorage.getItem("access_token");

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/branch-item-overrides/branch/${branchId}/item/${itemId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ price: Number(price) }),
        },
      );

      if (!res.ok) throw new Error("No se pudo guardar");

      navigate(-1);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 5 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Precio por sucursal
        </Typography>

        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          fullWidth
          label="Precio"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          sx={{ mt: 2 }}
        />

        <Button
          fullWidth
          variant="contained"
          sx={{ mt: 3 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </Paper>
    </Container>
  );
}
