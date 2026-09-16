import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, List, ListItem, ListItemText,
  CircularProgress, Box, Chip
} from "@mui/material";
import dayjs from "dayjs";
import "dayjs/locale/es";

const CLINIC_API = import.meta.env.VITE_CLINIC_API_URL || import.meta.env.VITE_API_URL || "";

export default function ClinicStuckAppointmentsModal({ open, onClose, token, onResolved }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadStuck();
  }, [open]);

  const loadStuck = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${CLINIC_API}/clinic/appointments/stuck`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (r.ok) {
        const d = await r.json();
        setAppointments(d.appointments || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await fetch(`${CLINIC_API}/clinic/appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      setAppointments(prev => prev.filter(a => a.id !== id));
      onResolved();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Citas sin Finalizar</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Estas citas son de días anteriores y nunca fueron marcadas como "Completada", "Cancelada" o "No Show".
          Por favor ciérralas para mantener el expediente al día.
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}><CircularProgress /></Box>
        ) : appointments.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center">
            ¡Todo al día! No hay citas estancadas.
          </Typography>
        ) : (
          <List>
            {appointments.map(a => {
              const d = dayjs(a.scheduled_at);
              const pName = a.patient?.client?.full_name ? `${a.patient.client.full_name} ${a.patient.client.last_name || ""}`.trim() : "Desconocido";
              return (
                <ListItem key={a.id} divider sx={{ flexDirection: "column", alignItems: "flex-start" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", mb: 1 }}>
                    <ListItemText 
                      primary={<Typography fontWeight="bold">{pName}</Typography>}
                      secondary={`${d.format("DD MMM YYYY, hh:mm A")} - ${a.clinic_service?.name || "Consulta"}`}
                    />
                    <Chip label={a.status} size="small" color="warning" />
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button variant="contained" color="success" size="small" onClick={() => handleUpdateStatus(a.id, "Completada")}>
                      Completada
                    </Button>
                    <Button variant="outlined" color="error" size="small" onClick={() => handleUpdateStatus(a.id, "Cancelada")}>
                      Cancelada
                    </Button>
                    <Button variant="text" color="inherit" size="small" onClick={() => handleUpdateStatus(a.id, "No Show")}>
                      No Show
                    </Button>
                  </Box>
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
