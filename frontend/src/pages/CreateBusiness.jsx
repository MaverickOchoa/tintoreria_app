// frontend/src/pages/CreateBusiness.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
} from "@mui/material";
import { createBusiness } from "../api/business";

export default function CreateBusinessPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    business_name: "",
    business_email: "",
    business_phone: "",
    business_address: "",
    owner_username: "",
    owner_password: "",
  });

  const onChange = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      // payload esperado (ajustable)
      const payload = {
        business_name: form.business_name,
        business_email: form.business_email || null,
        business_phone: form.business_phone || null,
        business_address: form.business_address,
        owner_username: form.owner_username,
        owner_password: form.owner_password,
      };

      await createBusiness(payload);
      navigate("/superadmin");
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Error creando negocio.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        p: 2,
        bgcolor: "background.default",
      }}
    >
      <Paper
        elevation={6}
        sx={{ p: 5, borderRadius: 3, width: "100%", maxWidth: 650 }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Crear Negocio
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Crea el negocio + dueño (Business Admin) + sucursal principal.
        </Typography>

        {err && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {err}
          </Alert>
        )}

        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Nombre del Negocio"
              value={form.business_name}
              onChange={onChange("business_name")}
              required
              fullWidth
            />
            <TextField
              label="Dirección"
              value={form.business_address}
              onChange={onChange("business_address")}
              required
              fullWidth
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Email (opcional)"
                value={form.business_email}
                onChange={onChange("business_email")}
                fullWidth
              />
              <TextField
                label="Teléfono (opcional)"
                value={form.business_phone}
                onChange={onChange("business_phone")}
                fullWidth
              />
            </Stack>

            <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 1 }}>
              Dueño (Business Admin)
            </Typography>

            <TextField
              label="Username del Dueño"
              value={form.owner_username}
              onChange={onChange("owner_username")}
              required
              fullWidth
            />
            <TextField
              label="Password del Dueño"
              value={form.owner_password}
              onChange={onChange("owner_password")}
              required
              type="password"
              fullWidth
            />

            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="text"
                color="secondary"
                onClick={() => navigate("/superadmin")}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="contained" disabled={loading}>
                {loading ? "Creando..." : "Crear"}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
