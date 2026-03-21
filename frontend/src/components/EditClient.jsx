import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box, TextField, Button, Typography, Paper, Snackbar, Alert,
  MenuItem, Divider, FormControlLabel, Checkbox, FormGroup,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EmailIcon from "@mui/icons-material/Email";
import { toTitleCase, isValidPhone, isValidEmail } from "../utils";

const API = import.meta.env.VITE_API_URL || API;

const rowStyle = {
  display: "flex",
  flexDirection: { xs: "column", sm: "row" },
  gap: 3,
  mb: 3,
};

const EditClient = () => {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const token = localStorage.getItem("access_token");

  const [clientData, setClientData] = useState({
    first_name: "", last_name: "", phone: "", email: "",
    date_of_birth_day: "", date_of_birth_month: "",
    street_number: "", neighborhood: "", zip_code: "", notes: "",
    client_type_id: "", username: "", password: "",
  });
  const [clientTypes, setClientTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [response, setResponse] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/v1/client-types`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setClientTypes(d.client_types || [])).catch(() => {});

    fetch(`${API}/api/v1/clients/${clientId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setClientData({
          first_name: data.full_name || "",
          last_name: data.last_name || "",
          phone: data.phone || "",
          email: data.email || "",
          date_of_birth_day: data.date_of_birth_day || "",
          date_of_birth_month: data.date_of_birth_month || "",
          street_number: data.street_and_number || "",
          neighborhood: data.neighborhood || "",
          zip_code: data.zip_code || "",
          notes: data.notes || "",
          client_type_id: data.client_type_id || "",
          username: data.username || "",
          password: "",
          whatsapp_consent: data.whatsapp_consent || false,
          email_consent: data.email_consent || false,
        });
      })
      .catch(() => setResponse({ success: false, message: "Error al cargar datos del cliente." }))
      .finally(() => setLoading(false));
  }, [clientId, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const titleFields = ["first_name", "last_name", "street_number", "neighborhood"];
    setClientData({ ...clientData, [name]: titleFields.includes(name) ? toTitleCase(value) : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setResponse(null);

    if (!clientData.first_name || !clientData.phone) {
      setResponse({ success: false, message: "El Nombre y el Teléfono son obligatorios." });
      setSaving(false);
      return;
    }
    if (!isValidPhone(clientData.phone)) {
      setResponse({ success: false, message: "El teléfono debe tener exactamente 10 dígitos." });
      setSaving(false);
      return;
    }
    if (clientData.email && !isValidEmail(clientData.email)) {
      setResponse({ success: false, message: "El formato del correo electrónico no es válido." });
      setSaving(false);
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
    dataToSend.username = clientData.first_name.trim().toLowerCase();

    try {
      const res = await fetch(`${API}/api/v1/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(dataToSend),
      });
      const data = await res.json();
      if (res.ok) {
        setResponse({ success: true, message: "Cliente actualizado exitosamente." });
        setTimeout(() => navigate("/clients"), 1500);
      } else {
        setResponse({ success: false, message: data.message || "Error al actualizar el cliente." });
      }
    } catch {
      setResponse({ success: false, message: "Error de conexión con el servidor." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Box sx={{ p: 3, textAlign: "center" }}><Typography>Cargando datos del cliente...</Typography></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 4, maxWidth: 900, margin: "auto" }}>
        <Button onClick={() => navigate("/clients")} startIcon={<ArrowBackIcon />}
          variant="outlined" size="small" sx={{ mb: 2 }} disabled={saving}>
          Regresar a Clientes
        </Button>
        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>Editar Cliente</Typography>

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
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Acceso al Portal del Cliente
          </Typography>
          <Box sx={rowStyle}>
            <TextField label="Nueva Contraseña" name="password" type="password"
              value={clientData.password} onChange={handleChange} sx={{ flex: 1 }}
              helperText={`Usuario del portal: ${(clientData.first_name || "").toLowerCase() || "se genera del nombre"}`} />
            <Box sx={{ flex: 1 }} />
          </Box>

          <Box sx={{ mt: 3 }}>
            <Button type="submit" variant="contained" color="primary" fullWidth disabled={saving}>
              {saving ? "Guardando..." : "Guardar Cambios"}
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

export default EditClient;
