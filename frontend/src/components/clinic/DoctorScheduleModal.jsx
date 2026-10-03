import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Button, Typography, Switch, TextField, IconButton, CircularProgress, Alert
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { CLINIC_API } from "./clinicTheme";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function DoctorScheduleModal({ open, onClose, doctorId, branchId, token }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!open || !doctorId) return;
    setLoading(true);
    let bId = branchId || localStorage.getItem("branch_id");
    if (!bId && token) {
       try {
           const payload = JSON.parse(atob(token.split('.')[1]));
           bId = payload.branch_id;
       } catch(e){}
    }
    fetch(`${CLINIC_API}/clinic/doctors/${doctorId}/schedule?branch_id=${bId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        setSchedules(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open, doctorId, token]);

  const updateDay = (idx, field, value) => {
    const nw = [...schedules];
    nw[idx] = { ...nw[idx], [field]: value };
    setSchedules(nw);
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      let bId = branchId || localStorage.getItem("branch_id");
      if (!bId && token) {
         try {
             const payload = JSON.parse(atob(token.split('.')[1]));
             bId = payload.branch_id;
         } catch(e){}
      }
      
      const r = await fetch(`${CLINIC_API}/clinic/doctors/${doctorId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ schedule: schedules, branch_id: parseInt(bId, 10) }),
      });
      if (r.ok) {
        setMsg({ type: "success", text: "Horarios guardados correctamente." });
        setTimeout(onClose, 1500);
      } else {
        throw new Error("Error al guardar");
      }
    } catch (e) {
      setMsg({ type: "error", text: "Error de conexión." });
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography fontWeight={800} fontSize={18}>Mis Horarios Laborales</Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {msg && <Alert severity={msg.type} sx={{ mb: 2 }}>{msg.text}</Alert>}
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
        ) : (
          <Box display="flex" flexDirection="column" gap={2}>
            {schedules.map((sch, i) => (
              <Box key={i} display="flex" alignItems="center" gap={2} p={1.5} border="1px solid #eee" borderRadius={2}
                sx={{ opacity: sch.active ? 1 : 0.5, transition: "0.2s" }}>
                <Box width={100}>
                  <Typography fontWeight={700}>{DAYS[sch.day]}</Typography>
                </Box>
                <Switch 
                  checked={sch.active} 
                  onChange={(e) => updateDay(i, "active", e.target.checked)} 
                  color="primary" 
                />
                <TextField 
                  type="time" size="small" 
                  value={sch.start} 
                  onChange={(e) => updateDay(i, "start", e.target.value)}
                  disabled={!sch.active}
                />
                <Typography color="text.secondary">a</Typography>
                <TextField 
                  type="time" size="small" 
                  value={sch.end} 
                  onChange={(e) => updateDay(i, "end", e.target.value)}
                  disabled={!sch.active}
                />
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: "#4361ee" }}>
          {saving ? <CircularProgress size={20} color="inherit" /> : "Guardar Horarios"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
