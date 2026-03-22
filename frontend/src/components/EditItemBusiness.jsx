import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Typography, TextField, Button, Alert, CircularProgress,
  Paper, InputAdornment,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";

const API = import.meta.env.VITE_API_URL || API;

const toTitleCase = (str) =>
  str ? str.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase()) : "";

export default function EditItemBusiness() {
  const { itemId } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [units, setUnits] = useState(1);
  const [categoryId, setCategoryId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("access_token");
  const claims = JSON.parse(localStorage.getItem("user_claims") || "{}");

  useEffect(() => {
    const allowed = ["business_admin", "branch_manager"];
    if (!allowed.includes(claims.role)) { navigate("/login"); return; }
    const branchId = claims.branch_id || claims.active_branch_id;
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/items/${itemId}`, { headers: h }).then(r => r.json()),
      branchId
        ? fetch(`${API}/api/v1/branch-item-overrides/branch/${branchId}/item/${itemId}`, { headers: h }).then(r => r.ok ? r.json() : null).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([itemData, overrideData]) => {
        const item = itemData.item || itemData;
        setName(toTitleCase(item.name || ""));
        setUnits(item.units || 1);
        // Use branch override price if it exists, otherwise global price
        const overridePrice = overrideData?.price;
        setPrice(String(overridePrice !== null && overridePrice !== undefined ? overridePrice : (item.price ?? "")));
        setCategoryId(item.category_id || null);
      })
      .catch(() => setError("Error al cargar el artículo."))
      .finally(() => setLoading(false));
  }, [itemId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !price) return;
    setSaving(true);
    setError("");
    const branchId = claims.branch_id || claims.active_branch_id;
    try {
      // Update global name (affects all branches)
      const resName = await fetch(`${API}/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: toTitleCase(name.trim()), units: parseInt(units) || 1 }),
      });
      if (!resName.ok) {
        const d = await resName.json().catch(() => ({}));
        throw new Error(d.message || `Error ${resName.status}`);
      }
      // Update branch-specific price override
      if (branchId) {
        const resPrice = await fetch(`${API}/api/v1/branch-item-overrides/branch/${branchId}/item/${itemId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ price: parseFloat(price) }),
        });
        if (!resPrice.ok) {
          const d = await resPrice.json().catch(() => ({}));
          throw new Error(d.message || `Error guardando precio`);
        }
      }
      if (categoryId) window.location.href = `/manage-items-business/${categoryId}`;
      else navigate(-1);
    } catch (err) {
      setError(err.message || "Error al guardar.");
      setSaving(false);
    }
  };

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" mt={8}>
      <CircularProgress sx={{ mr: 2 }} />
      <Typography>Cargando artículo...</Typography>
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 480, mx: "auto", mt: 6, px: 2 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" fontWeight="bold" mb={3}>
          Editar Artículo
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <Box display="flex" flexDirection="column" gap={3}>
            <TextField
              fullWidth
              label="Nombre"
              value={name}
              onChange={e => setName(toTitleCase(e.target.value))}
              required
              disabled={saving}
            />

            <TextField
              fullWidth
              label="Precio"
              type="number"
              inputProps={{ step: "0.01", min: "0" }}
              value={price}
              onChange={e => setPrice(e.target.value)}
              required
              disabled={saving}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AttachMoneyIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Número de prendas por unidad"
              type="number"
              inputProps={{ min: 1, step: 1 }}
              value={units}
              onChange={e => setUnits(e.target.value)}
              disabled={saving}
              helperText="Ej: 2 para traje 2 piezas, 3 para traje 3 piezas"
            />

            <Box display="flex" gap={2}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => categoryId ? navigate(`/manage-items-business/${categoryId}`) : navigate(-1)}
                disabled={saving}
                fullWidth
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                disabled={saving || !name.trim() || !price}
                fullWidth
              >
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
