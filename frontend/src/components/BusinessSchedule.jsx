import React, { useState, useEffect } from "react";
import {
  Box, Typography, Paper, Grid, Switch, FormControlLabel, TextField,
  Button, Divider, CircularProgress, Alert, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const defaultHours = DAYS.map((_, i) => ({
  day_of_week: i,
  is_open: i < 6,
  open_time: "09:00",
  close_time: "19:00",
}));

export default function BusinessSchedule({ businessId, token }) {
  const [hours, setHours] = useState(defaultHours);
  const [holidays, setHolidays] = useState([]);
  const [savingH, setSavingH] = useState(false);
  const [msgH, setMsgH] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ name: "", is_recurring: true, month: 1, day: 1, specific_date: "" });

  useEffect(() => {
    if (!businessId) return;
    fetch(`${API}/api/v1/businesses/${businessId}/hours`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setHours(defaultHours.map(def => {
            const found = data.find(h => h.day_of_week === def.day_of_week);
            return found ? { ...def, ...found } : def;
          }));
        }
      }).catch(console.error);
    fetch(`${API}/api/v1/businesses/${businessId}/holidays`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setHolidays(data); })
      .catch(console.error);
  }, [businessId, token]);

  const updateHour = (i, field, value) => {
    setHours(h => h.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  };

  const saveHours = async () => {
    setSavingH(true); setMsgH(null);
    try {
      const res = await fetch(`${API}/api/v1/businesses/${businessId}/hours`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(hours),
      });
      if (res.ok) setMsgH({ type: "success", text: "Horarios guardados" });
      else setMsgH({ type: "error", text: "Error al guardar" });
    } catch { setMsgH({ type: "error", text: "Error de conexión" }); }
    finally { setSavingH(false); }
  };

  const addHoliday = async () => {
    const body = newHoliday.is_recurring
      ? { name: newHoliday.name, is_recurring: true, month: parseInt(newHoliday.month), day: parseInt(newHoliday.day) }
      : { name: newHoliday.name, is_recurring: false, specific_date: newHoliday.specific_date };
    const res = await fetch(`${API}/api/v1/businesses/${businessId}/holidays`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const d = await res.json();
      setHolidays(h => [...h, d]);
      setAddOpen(false);
      setNewHoliday({ name: "", is_recurring: true, month: 1, day: 1, specific_date: "" });
    }
  };

  const toggleHoliday = async (h) => {
    const res = await fetch(`${API}/api/v1/businesses/${businessId}/holidays/${h.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_active: !h.is_active }),
    });
    if (res.ok) setHolidays(prev => prev.map(x => x.id === h.id ? { ...x, is_active: !h.is_active } : x));
  };

  const deleteHoliday = async (id) => {
    await fetch(`${API}/api/v1/businesses/${businessId}/holidays/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    setHolidays(prev => prev.filter(x => x.id !== id));
  };

  return (
    <Box>
      {/* HORARIOS */}
      <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={700} mb={2}>Horario de Servicio</Typography>
        <Grid container spacing={1}>
          {hours.map((row, i) => (
            <Grid item xs={12} key={i}>
              <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                <FormControlLabel
                  sx={{ minWidth: 110 }}
                  control={<Switch checked={row.is_open} onChange={e => updateHour(i, 'is_open', e.target.checked)} size="small" />}
                  label={<Typography variant="body2" fontWeight={600}>{DAYS[i]}</Typography>}
                />
                {row.is_open && (<>
                  <TextField label="Apertura" type="time" size="small" value={row.open_time || "09:00"}
                    onChange={e => updateHour(i, 'open_time', e.target.value)}
                    InputLabelProps={{ shrink: true }} sx={{ width: 130 }} />
                  <TextField label="Cierre" type="time" size="small" value={row.close_time || "19:00"}
                    onChange={e => updateHour(i, 'close_time', e.target.value)}
                    InputLabelProps={{ shrink: true }} sx={{ width: 130 }} />
                </>)}
                {!row.is_open && <Typography variant="body2" color="text.disabled">Cerrado</Typography>}
              </Box>
              {i < 6 && <Divider sx={{ mt: 1 }} />}
            </Grid>
          ))}
        </Grid>
        <Box mt={2}>
          <Button variant="contained" size="small" startIcon={savingH ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
            onClick={saveHours} disabled={savingH}>Guardar horarios</Button>
        </Box>
        {msgH && <Alert severity={msgH.type} sx={{ mt: 1 }}>{msgH.text}</Alert>}
      </Paper>

      {/* FESTIVOS */}
      <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={700}>Días Festivos</Typography>
          <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>Agregar</Button>
        </Box>
        <Box display="flex" flexWrap="wrap" gap={1}>
          {holidays.map(h => (
            <Chip key={h.id}
              label={h.is_recurring ? `${h.name} (${h.day}/${h.month})` : `${h.name} (${h.specific_date})`}
              color={h.is_active ? "primary" : "default"}
              variant={h.is_active ? "filled" : "outlined"}
              onClick={() => toggleHoliday(h)}
              onDelete={() => deleteHoliday(h.id)}
              deleteIcon={<DeleteIcon />}
              size="small"
            />
          ))}
          {holidays.length === 0 && <Typography variant="body2" color="text.secondary">Sin festivos configurados.</Typography>}
        </Box>
        <Typography variant="caption" color="text.secondary" mt={1} display="block">
          Click en el festivo para activarlo/desactivarlo. Los festivos inactivos no bloquean fechas.
        </Typography>
      </Paper>

      {/* DIALOG agregar festivo */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Agregar día festivo</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField label="Nombre del festivo" size="small" fullWidth
              value={newHoliday.name} onChange={e => setNewHoliday(p => ({ ...p, name: e.target.value }))} />
            <FormControlLabel
              control={<Switch checked={newHoliday.is_recurring} onChange={e => setNewHoliday(p => ({ ...p, is_recurring: e.target.checked }))} />}
              label="Recurrente (mismo día cada año)" />
            {newHoliday.is_recurring ? (
              <TextField label="Selecciona una fecha (se usará mes y día)" type="date" size="small" fullWidth
                InputLabelProps={{ shrink: true }}
                onChange={e => {
                  const [, m, d] = (e.target.value || "").split("-");
                  if (m && d) setNewHoliday(p => ({ ...p, month: parseInt(m), day: parseInt(d) }));
                }}
                helperText={newHoliday.month && newHoliday.day ? `Cada año el ${newHoliday.day}/${newHoliday.month}` : "Elige fecha para extraer día y mes"}
              />
            ) : (
              <TextField label="Fecha específica" type="date" size="small" fullWidth
                value={newHoliday.specific_date} onChange={e => setNewHoliday(p => ({ ...p, specific_date: e.target.value }))}
                InputLabelProps={{ shrink: true }} />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={addHoliday} disabled={!newHoliday.name}>Agregar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
