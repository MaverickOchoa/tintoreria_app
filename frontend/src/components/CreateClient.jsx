import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, TextField, Button, Typography, Paper, Snackbar, Alert,
  MenuItem, Divider, FormControlLabel, Checkbox, FormGroup,
} from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EmailIcon from "@mui/icons-material/Email";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { toTitleCase, isValidPhone, isValidEmail } from "../utils";

const API_BASE_URL = import.meta.env.VITE_API_URL || API;

const rowStyle = {
  display: "flex",
  flexDirection: { xs: "column", sm: "row" },
  gap: 3,
  mb: 3,
};

const getClaims = () => {
  try { return JSON.parse(localStorage.getItem("user_claims") || "{}"); } catch { return {}; }
};

const CreateClient = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");
  const claims = getClaims();

  const [clientData, setClientData] = useState({
    first_name: "", last_name: "", phone: "", email: "",
    date_of_birth_day: "", date_of_birth_month: "",
    street_number: "", neighborhood: "", zip_code: "", notes: "",
    client_type_id: "",
    whatsapp_consent: false, email_consent: false,
  });
  const [clientTypes, setClientTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/client-types`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setClientTypes(d.client_types || []))
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const titleFields = ["first_name", "last_name", "street_number", "neighborhood"];
    setClientData({ ...clientData, [name]: titleFields.includes(name) ? toTitleCase(value) : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);

    if (!clientData.first_name.trim() || !clientData.phone.trim()) {
      setResponse({ success: false, message: "El Nombre y el Teléfono son obligatorios." });
      setLoading(false);
      return;
    }
    if (!isValidPhone(clientData.phone)) {
      setResponse({ success: false, message: "El teléfono debe tener exactamente 10 dígitos." });
      setLoading(false);
      return;
    }
    if (clientData.email && !isValidEmail(clientData.email)) {
      setResponse({ success: false, message: "El formato del correo electrónico no es válido." });
      setLoading(false);
      return;
    }

    const dataToSend = {};
    for (const key in clientData) {
      if (key === "username") continue;
      if (clientData[key] !== "") {
        const numFields = ["date_of_birth_day", "date_of_birth_month", "zip_code", "client_type_id"];
        dataToSend[key] = numFields.includes(key) ? parseInt(clientData[key], 10) : clientData[key];
      }
    }
    if (clientData.password) {
      dataToSend.username = clientData.first_name.trim().toLowerCase();
    }
    if (claims.branch_id) dataToSend.branch_id = claims.branch_id;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(dataToSend),
      });
      const data = await res.json();
      if (res.ok) { navigate("/clients"); return; }
      setResponse({ success: false, message: data.message || "Error al registrar el cliente." });
    } catch {
      setResponse({ success: false, message: "Error de conexión con el servidor." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 4, maxWidth: 900, margin: "auto" }}>
        <Button onClick={() => navigate("/clients")} startIcon={<ArrowBackIcon />}
          variant="outlined" size="small" sx={{ mb: 2 }} disabled={loading}>
          Regresar a Clientes
        </Button>
        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>Registrar Nuevo Cliente</Typography>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Box sx={rowStyle}>
            <TextField required label="Nombre" name="first_name" value={clientData.first_name}
              onChange={handleChange} sx={{ flex: 1 }} />
            <TextField label="Apellido" name="last_name" value={clientData.last_name}
              onChange={handleChange} sx={{ flex: 1 }} />
          </Box>

          <Box sx={rowStyle}>
            <TextField required label="Teléfono" name="phone" type="tel"
              value={clientData.phone} onChange={handleChange} sx={{ flex: 1 }}
              inputProps={{ maxLength: 10 }}
              helperText="10 dígitos sin espacios" />
            <TextField label="Correo Electrónico" name="email" type="email"
              value={clientData.email} onChange={handleChange} sx={{ flex: 1 }} />
          </Box>

          <Box sx={rowStyle}>
            <TextField select label="Tipo de Cliente" name="client_type_id"
              value={clientData.client_type_id} onChange={handleChange} sx={{ flex: 1 }}>
              <MenuItem value="">— Sin tipo —</MenuItem>
              {clientTypes.map(t => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </TextField>
            <Box sx={{ flex: 1 }} />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Permisos de comunicación
            </Typography>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={clientData.whatsapp_consent}
                    onChange={e => setClientData({ ...clientData, whatsapp_consent: e.target.checked })}
                    color="success"
                    icon={<WhatsAppIcon sx={{ color: "action.disabled" }} />}
                    checkedIcon={<WhatsAppIcon sx={{ color: "#25D366" }} />}
                  />
                }
                label="Acepta recibir mensajes por WhatsApp"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={clientData.email_consent}
                    onChange={e => setClientData({ ...clientData, email_consent: e.target.checked })}
                    color="primary"
                    icon={<EmailIcon sx={{ color: "action.disabled" }} />}
                    checkedIcon={<EmailIcon sx={{ color: "primary.main" }} />}
                  />
                }
                label="Acepta recibir correos electrónicos"
              />
            </FormGroup>
          </Box>

          <Box sx={{ ...rowStyle, flexDirection: "column" }}>
            <Typography variant="subtitle1" color="text.secondary">Fecha de Cumpleaños</Typography>
            <Box sx={{ display: "flex", gap: 3, flexDirection: { xs: "column", sm: "row" } }}>
              <TextField label="Día" name="date_of_birth_day" type="number"
                value={clientData.date_of_birth_day} onChange={handleChange}
                inputProps={{ min: 1, max: 31 }} sx={{ flex: 1 }} />
              <TextField label="Mes" name="date_of_birth_month" type="number"
                value={clientData.date_of_birth_month} onChange={handleChange}
                inputProps={{ min: 1, max: 12 }} sx={{ flex: 1 }} />
              <Box sx={{ flex: 2, display: { xs: "none", sm: "block" } }} />
            </Box>
          </Box>

          <Box sx={{ ...rowStyle, flexDirection: "column" }}>
            <TextField fullWidth label="Calle y Número" name="street_number"
              value={clientData.street_number} onChange={handleChange} />
          </Box>

          <Box sx={rowStyle}>
            <TextField label="Colonia" name="neighborhood" value={clientData.neighborhood}
              onChange={handleChange} sx={{ flex: 1 }} />
            <TextField label="Código Postal" name="zip_code" type="number"
              value={clientData.zip_code} onChange={handleChange} sx={{ flex: 1 }} />
          </Box>

          <Box sx={{ ...rowStyle, flexDirection: "column" }}>
            <TextField fullWidth label="Notas" name="notes" value={clientData.notes}
              onChange={handleChange} multiline rows={3} />
          </Box>

          <Divider sx={{ my: 2 }} />
          <Box sx={{ bgcolor: "grey.50", borderRadius: 2, p: 2, mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Las credenciales del portal se generan automáticamente:
              usuario = <strong>nombre.apellido</strong>, contraseña temporal = <strong>número de teléfono</strong>.
              Se enviarán por el canal configurado en Mensajes Automáticos.
            </Typography>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading}>
              {loading ? "Creando..." : "Registrar Cliente"}
            </Button>
          </Box>
        </Box>
      </Paper>

      <Snackbar open={!!response} autoHideDuration={6000} onClose={() => setResponse(null)}>
        <Alert onClose={() => setResponse(null)} severity={response?.success ? "success" : "error"}
          sx={{ width: "100%" }}>
          {response?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CreateClient;
