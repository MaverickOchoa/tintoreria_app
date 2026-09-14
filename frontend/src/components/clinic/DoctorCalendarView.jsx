import React, { useState, useEffect } from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import "moment/locale/es";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  FormControlLabel, Switch, CircularProgress, Chip
} from "@mui/material";

moment.locale("es");
const localizer = momentLocalizer(moment);

const CLINIC_API = import.meta.env.VITE_CLINIC_API_URL || import.meta.env.VITE_API_URL || "";

export default function DoctorCalendarView({ doctor, branchId, token }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [range, setRange] = useState({
    start: moment().startOf('month').toDate(),
    end: moment().endOf('month').toDate()
  });

  const loadEvents = () => {
    if (!branchId || !doctor?.id) return;
    setLoading(true);
    
    const startStr = moment(range.start).format("YYYY-MM-DD");
    const endStr = moment(range.end).format("YYYY-MM-DD");

    fetch(`${CLINIC_API}/clinic/doctors/${doctor.id}/calendar-events?branch_id=${branchId}&start=${startStr}&end=${endStr}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.events) {
          const parsed = d.events.map(e => ({
            ...e,
            start: new Date(e.start),
            end: new Date(e.end)
          }));
          setEvents(parsed);
        } else {
          setEvents([]);
        }
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEvents();
  }, [branchId, doctor?.id, range.start, range.end]);

  const onRangeChange = (r) => {
    if (Array.isArray(r)) {
      setRange({ start: r[0], end: r[r.length - 1] });
    } else if (r.start && r.end) {
      setRange({ start: r.start, end: r.end });
    }
  };

  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  const [form, setForm] = useState({
    date: "",
    is_available: false,
    all_day: false,
    start_time: "09:00",
    end_time: "17:00",
    reason: ""
  });

  const handleSelectSlot = (slotInfo) => {
    setModalMode("create");
    setForm({
      date: moment(slotInfo.start).format("YYYY-MM-DD"),
      is_available: false,
      all_day: false,
      start_time: moment(slotInfo.start).format("HH:mm"),
      end_time: moment(slotInfo.end).format("HH:mm") !== "00:00" ? moment(slotInfo.end).format("HH:mm") : moment(slotInfo.start).add(1, "hour").format("HH:mm"),
      reason: ""
    });
    setOpenModal(true);
  };

  const handleSelectEvent = (event) => {
    if (event.type === "appointment") {
      alert("Para modificar citas, ve a la pestaña Citas.");
      return;
    }
    if (event.type === "schedule") {
      alert("Este es un turno de la plantilla base semanal. \nPuedes dibujar encima un Bloqueo si quieres cancelarlo, o editar la plantilla desde los Ajustes base.");
      return;
    }
    
    setModalMode("edit");
    setSelectedEvent(event);
    setForm({
      date: moment(event.start).format("YYYY-MM-DD"),
      is_available: event.type === "extra_shift",
      all_day: event.allDay,
      start_time: event.allDay ? "" : moment(event.start).format("HH:mm"),
      end_time: event.allDay ? "" : moment(event.end).format("HH:mm"),
      reason: event.resource?.reason || ""
    });
    setOpenModal(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        branch_id: branchId,
        blocked_date: form.date,
        all_day: form.all_day,
        is_available: form.is_available,
        start_time: form.all_day ? null : form.start_time,
        end_time: form.all_day ? null : form.end_time,
        reason: form.reason
      };

      const res = await fetch(`${CLINIC_API}/clinic/doctors/${doctor.id}/blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Error al guardar la excepción");
      
      setOpenModal(false);
      loadEvents();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent?.resource?.id) return;
    try {
      const res = await fetch(`${CLINIC_API}/clinic/doctors/${doctor.id}/blocks/${selectedEvent.resource.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Error al eliminar");
      
      setOpenModal(false);
      loadEvents();
    } catch (e) {
      alert(e.message);
    }
  };

  const eventPropGetter = (event) => {
    let backgroundColor = "#4361ee";
    if (event.type === "appointment") backgroundColor = "#10b981";
    else if (event.type === "block") backgroundColor = "#ef4444";
    else if (event.type === "extra_shift") backgroundColor = "#f59e0b";
    else if (event.type === "schedule") backgroundColor = "#94a3b8";

    return { style: { backgroundColor, borderRadius: "4px", opacity: 0.9, border: "none" } };
  };

  return (
    <Box sx={{ height: 600, position: "relative", mt: 2 }}>
      {loading && (
        <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(255,255,255,0.7)", zIndex: 10 }}>
          <CircularProgress />
        </Box>
      )}
      
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <Chip size="small" sx={{ bgcolor: "#94a3b8", color: "white" }} label="Plantilla Base" />
        <Chip size="small" sx={{ bgcolor: "#f59e0b", color: "white" }} label="Turno Extra" />
        <Chip size="small" sx={{ bgcolor: "#ef4444", color: "white" }} label="Ausencia / Bloqueo" />
        <Chip size="small" sx={{ bgcolor: "#10b981", color: "white" }} label="Cita Programada" />
      </Box>

      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "100%" }}
        onRangeChange={onRangeChange}
        selectable
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={eventPropGetter}
        views={[Views.MONTH, Views.WEEK, Views.DAY]}
        defaultView={Views.WEEK}
        messages={{
          next: "Siguiente",
          previous: "Anterior",
          today: "Hoy",
          month: "Mes",
          week: "Semana",
          day: "Día"
        }}
      />

      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{modalMode === "create" ? "Añadir Excepción" : "Editar Excepción"}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de Excepción</InputLabel>
              <Select
                label="Tipo de Excepción"
                value={form.is_available}
                onChange={e => setForm({ ...form, is_available: e.target.value })}
              >
                <MenuItem value={false}>Bloqueo / Ausencia</MenuItem>
                <MenuItem value={true}>Turno Extra</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="Fecha"
              type="date"
              fullWidth size="small"
              InputLabelProps={{ shrink: true }}
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
            />

            <FormControlLabel
              control={<Switch checked={form.all_day} onChange={e => setForm({ ...form, all_day: e.target.checked })} />}
              label="Todo el día"
            />

            {!form.all_day && (
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  label="Hora Inicio"
                  type="time"
                  fullWidth size="small"
                  InputLabelProps={{ shrink: true }}
                  value={form.start_time}
                  onChange={e => setForm({ ...form, start_time: e.target.value })}
                />
                <TextField
                  label="Hora Fin"
                  type="time"
                  fullWidth size="small"
                  InputLabelProps={{ shrink: true }}
                  value={form.end_time}
                  onChange={e => setForm({ ...form, end_time: e.target.value })}
                />
              </Box>
            )}

            <TextField
              label="Motivo (Opcional)"
              fullWidth size="small"
              value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
            />

          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
          {modalMode === "edit" ? (
            <Button color="error" onClick={handleDelete}>Eliminar</Button>
          ) : <Box />}
          <Box>
            <Button onClick={() => setOpenModal(false)}>Cancelar</Button>
            <Button variant="contained" onClick={handleSave}>Guardar</Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
