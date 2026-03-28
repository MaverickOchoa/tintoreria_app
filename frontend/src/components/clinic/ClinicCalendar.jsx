import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Paper, Button, TextField, IconButton, Chip,
  CircularProgress, Avatar, Tooltip, Select, MenuItem, FormControl, InputLabel,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";
import TodayIcon from "@mui/icons-material/Today";
import { CLINIC_API } from "./clinicTheme";
import ClinicNewAppointment from "./ClinicNewAppointment";

const API = import.meta.env.VITE_API_URL || "";
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7am - 7pm

const STATUS_COLORS = {
  "Agendada":   "#4361ee",
  "Confirmada": "#7209b7",
  "En Consulta":"#f77f00",
  "Completada": "#2dc653",
  "No Show":    "#e63946",
  "Cancelada":  "#aaa",
};

function slotToY(scheduledAt, hourStart = 7) {
  const d = dayjs(scheduledAt);
  const minutesFromStart = (d.hour() - hourStart) * 60 + d.minute();
  return Math.max(0, minutesFromStart);
}

export default function ClinicCalendar() {
  const token = localStorage.getItem("access_token");
  const claims = JSON.parse(localStorage.getItem("user_claims") || "{}");
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [filterDoctor, setFilterDoctor] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewApt, setShowNewApt] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const loadAppointments = useCallback(async (date) => {
    setLoading(true);
    const d = date.format("YYYY-MM-DD");
    try {
      const res = await fetch(
        `${CLINIC_API}/clinic/appointments?date_from=${d}&date_to=${d}${filterDoctor ? `&doctor_id=${filterDoctor}` : ""}`,
        { headers }
      );
      const data = await res.json();
      setAppointments(data.appointments || []);
    } catch { setAppointments([]); }
    setLoading(false);
  }, [filterDoctor]);

  useEffect(() => {
    if (claims.business_id) {
      fetch(`${API}/employees?business_id=${claims.business_id}`, { headers })
        .then(r => r.json())
        .then(d => setDoctors(Array.isArray(d.employees) ? d.employees : []))
        .catch(() => {});
    }
  }, []);

  useEffect(() => { loadAppointments(selectedDate); }, [selectedDate, filterDoctor]);

  const prevDay = () => setSelectedDate(d => d.subtract(1, "day"));
  const nextDay = () => setSelectedDate(d => d.add(1, "day"));
  const today = () => setSelectedDate(dayjs());

  const PX_PER_MIN = 1.2;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ p: 1, bgcolor: "#4361ee", borderRadius: 2, display: "flex" }}>
              <TodayIcon sx={{ color: "#fff" }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700}>Agenda</Typography>
              <Typography variant="body2" color="text.secondary">{selectedDate.format("dddd, D [de] MMMM [de] YYYY")}</Typography>
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Doctor</InputLabel>
              <Select label="Doctor" value={filterDoctor} onChange={e => setFilterDoctor(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {doctors.map(d => <MenuItem key={d.id} value={d.id}>{d.full_name}</MenuItem>)}
              </Select>
            </FormControl>
            <DatePicker value={selectedDate} onChange={v => v && setSelectedDate(v)}
              slotProps={{ textField: { size: "small" } }} />
            <IconButton onClick={prevDay}><ChevronLeftIcon /></IconButton>
            <Button variant="outlined" size="small" onClick={today}>Hoy</Button>
            <IconButton onClick={nextDay}><ChevronRightIcon /></IconButton>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowNewApt(true)}
              sx={{ bgcolor: "#4361ee", "&:hover": { bgcolor: "#3451d1" } }}>
              Nueva Cita
            </Button>
          </Box>
        </Box>

        {/* Timeline */}
        <Paper sx={{ borderRadius: 2, overflow: "auto", position: "relative" }}>
          {loading ? (
            <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
          ) : (
            <Box sx={{ display: "flex", minWidth: 700 }}>
              {/* Hour labels */}
              <Box sx={{ width: 56, flexShrink: 0, borderRight: "1px solid #e0e0e0" }}>
                {HOURS.map(h => (
                  <Box key={h} sx={{ height: 60, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", pr: 1, pt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">{h}:00</Typography>
                  </Box>
                ))}
              </Box>

              {/* Events area */}
              <Box sx={{ flex: 1, position: "relative", minHeight: HOURS.length * 60 }}>
                {/* Hour lines */}
                {HOURS.map((h, i) => (
                  <Box key={h} sx={{ position: "absolute", top: i * 60, left: 0, right: 0, borderTop: "1px solid #f0f0f0", pointerEvents: "none" }} />
                ))}

                {appointments.length === 0 ? (
                  <Box display="flex" alignItems="center" justifyContent="center" height="100%" py={8}>
                    <Typography color="text.secondary">No hay citas para este día</Typography>
                  </Box>
                ) : appointments.map(apt => {
                  const top = slotToY(apt.scheduled_at) * PX_PER_MIN;
                  const height = Math.max((apt.duration_minutes || 30) * PX_PER_MIN, 36);
                  const color = STATUS_COLORS[apt.status] || "#4361ee";
                  return (
                    <Tooltip key={apt.id} title={`${apt.patient_name} — ${apt.service_name || "Sin servicio"}`}>
                      <Box sx={{
                        position: "absolute",
                        top, left: 8, right: 8,
                        height,
                        bgcolor: color + "22",
                        borderLeft: `4px solid ${color}`,
                        borderRadius: 1,
                        px: 1, py: 0.5,
                        overflow: "hidden",
                        cursor: "pointer",
                      }}>
                        <Typography fontSize={12} fontWeight={700} noWrap sx={{ color }}>
                          {dayjs(apt.scheduled_at).format("HH:mm")} — {apt.patient_name}
                        </Typography>
                        <Typography fontSize={11} color="text.secondary" noWrap>
                          {apt.service_name || "Sin servicio"}{apt.doctor_name ? ` · Dr. ${apt.doctor_name}` : ""}
                        </Typography>
                        <Chip label={apt.status} size="small" sx={{ fontSize: 10, height: 18, bgcolor: color + "33", color }} />
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>
            </Box>
          )}
        </Paper>

        {showNewApt && (
          <ClinicNewAppointment
            open={showNewApt}
            onClose={() => setShowNewApt(false)}
            onCreated={() => { setShowNewApt(false); loadAppointments(selectedDate); }}
          />
        )}
      </Box>
    </LocalizationProvider>
  );
}
