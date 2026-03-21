import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Chip, Avatar, IconButton, Tooltip,
  Paper, Skeleton, Badge, Menu, MenuItem, Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import { STATUS_CONFIG, DOCTOR_COLORS, CLINIC_API } from "./clinicTheme";
import ClinicNewAppointment from "./ClinicNewAppointment";
import ClinicRecordModal from "./ClinicRecordModal";

const COLUMNS = ["Agendada", "Confirmada", "En Consulta", "Completada", "No Show", "Cancelada"];

function getDoctorColor(doctorId) {
  if (!doctorId) return "#9e9e9e";
  return DOCTOR_COLORS[doctorId % DOCTOR_COLORS.length];
}

function AptCard({ apt, onStatusChange, onViewRecord, doctorColorMap }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const cfg = STATUS_CONFIG[apt.status] || STATUS_CONFIG["Agendada"];
  const time = apt.scheduled_at
    ? new Date(apt.scheduled_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
    : "—";
  const doctorColor = doctorColorMap[apt.doctor_id] || "#9e9e9e";
  const doctorInitial = apt.doctor_name ? apt.doctor_name[0].toUpperCase() : "?";

  const NEXT_STATUS = {
    Agendada: ["Confirmada", "No Show", "Cancelada"],
    Confirmada: ["En Consulta", "No Show", "Cancelada"],
    "En Consulta": ["Completada", "No Show", "Cancelada"],
    Completada: [],
    "No Show": [],
    Cancelada: [],
  };

  return (
    <Paper
      elevation={0}
      sx={{
        border: `1.5px solid ${cfg.color}22`,
        borderLeft: `4px solid ${cfg.color}`,
        borderRadius: 2,
        p: 1.5,
        mb: 1,
        bgcolor: "#fff",
        cursor: "pointer",
        transition: "box-shadow 0.15s, transform 0.1s",
        "&:hover": { boxShadow: "0 4px 16px rgba(0,0,0,0.10)", transform: "translateY(-1px)" },
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Typography fontWeight={700} fontSize={13} lineHeight={1.3} noWrap sx={{ maxWidth: 150 }}>
          {apt.patient_name || "Paciente"}
        </Typography>
        <IconButton size="small" sx={{ mt: -0.5, mr: -0.5 }} onClick={e => { e.stopPropagation(); setAnchorEl(e.currentTarget); }}>
          <MoreVertIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {apt.service_name && (
        <Chip
          label={apt.service_name}
          size="small"
          icon={<MedicalServicesIcon sx={{ fontSize: "12px !important" }} />}
          sx={{ fontSize: 10, height: 20, mt: 0.5, bgcolor: cfg.bg, color: cfg.color, border: "none" }}
        />
      )}

      <Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
        <Box display="flex" alignItems="center" gap={0.5}>
          <AccessTimeIcon sx={{ fontSize: 13, color: "#9e9e9e" }} />
          <Typography fontSize={11} color="text.secondary">{time}</Typography>
          {apt.duration_minutes && (
            <Typography fontSize={11} color="text.secondary">· {apt.duration_minutes}min</Typography>
          )}
        </Box>
        <Tooltip title={apt.doctor_name || "Sin doctor"}>
          <Avatar sx={{ width: 22, height: 22, bgcolor: doctorColor, fontSize: 10 }}>
            {doctorInitial}
          </Avatar>
        </Tooltip>
      </Box>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} onClick={e => e.stopPropagation()}>
        {(NEXT_STATUS[apt.status] || []).map(s => (
          <MenuItem key={s} dense onClick={() => { onStatusChange(apt.id, s); setAnchorEl(null); }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: STATUS_CONFIG[s]?.color, mr: 1 }} />
            Mover a {s}
          </MenuItem>
        ))}
        {(NEXT_STATUS[apt.status] || []).length > 0 && <Divider />}
        <MenuItem dense onClick={() => { onViewRecord(apt); setAnchorEl(null); }}>
          <MedicalServicesIcon fontSize="small" sx={{ mr: 1 }} /> Ver / Crear expediente
        </MenuItem>
      </Menu>
    </Paper>
  );
}

function KanbanColumn({ status, appointments, onStatusChange, onViewRecord, doctorColorMap }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <Box sx={{
      minWidth: 220, maxWidth: 240, flex: "0 0 220px",
      display: "flex", flexDirection: "column",
    }}>
      {/* Column header */}
      <Box sx={{
        display: "flex", alignItems: "center", gap: 1,
        px: 1.5, py: 1.2,
        bgcolor: cfg.bg,
        borderRadius: "10px 10px 0 0",
        borderTop: `3px solid ${cfg.color}`,
      }}>
        <Typography fontSize={13} fontWeight={700} color={cfg.color}>{cfg.emoji} {status}</Typography>
        <Chip
          label={appointments.length}
          size="small"
          sx={{ ml: "auto", height: 20, minWidth: 24, fontSize: 11, bgcolor: cfg.color, color: "#fff" }}
        />
      </Box>

      {/* Cards */}
      <Box sx={{
        flex: 1, p: 1, overflowY: "auto",
        bgcolor: cfg.bg + "88",
        borderRadius: "0 0 10px 10px",
        minHeight: 120,
      }}>
        {appointments.length === 0 && (
          <Typography fontSize={11} color="text.disabled" textAlign="center" mt={2}>Sin citas</Typography>
        )}
        {appointments.map(apt => (
          <AptCard
            key={apt.id}
            apt={apt}
            onStatusChange={onStatusChange}
            onViewRecord={onViewRecord}
            doctorColorMap={doctorColorMap}
          />
        ))}
      </Box>
    </Box>
  );
}

export default function ClinicKanban() {
  const { token, claims } = useOutletContext();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [recordApt, setRecordApt] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));

  const doctorColorMap = {};
  doctors.forEach((d, i) => { doctorColorMap[d.id] = DOCTOR_COLORS[i % DOCTOR_COLORS.length]; });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(
        `${CLINIC_API}/clinic/appointments?date_from=${filterDate}&date_to=${filterDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const d = await r.json();
      setAppointments(Array.isArray(d.appointments) ? d.appointments : []);
    } catch {
      setAppointments([]);
    }
    setLoading(false);
  }, [token, filterDate]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (aptId, newStatus) => {
    try {
      await fetch(`${CLINIC_API}/clinic/appointments/${aptId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      setAppointments(prev => prev.map(a => a.id === aptId ? { ...a, status: newStatus } : a));
    } catch {}
  };

  const byStatus = (status) => appointments.filter(a => a.status === status);

  const totalActive = appointments.filter(a => !["Completada", "Cancelada", "No Show"].includes(a.status)).length;

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* ── TOP BAR ── */}
      <Box sx={{
        px: 3, py: 2,
        bgcolor: "#fff",
        borderBottom: "1px solid #e8eaed",
        display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap",
      }}>
        <Box>
          <Typography variant="h6" fontWeight={800}>Tablero de Citas</Typography>
          <Typography variant="caption" color="text.secondary">
            {totalActive} citas activas hoy
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center", ml: "auto", flexWrap: "wrap" }}>
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            style={{
              border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 10px",
              fontSize: 13, color: "#333", outline: "none", background: "#f8f9fa",
            }}
          />
          <Tooltip title="Recargar">
            <IconButton size="small" onClick={load}><RefreshIcon /></IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            size="small"
            onClick={() => setOpenNew(true)}
            sx={{ bgcolor: "#4361ee", "&:hover": { bgcolor: "#3251d3" }, borderRadius: 2, fontWeight: 700 }}
          >
            Nueva Cita
          </Button>
        </Box>
      </Box>

      {/* ── KANBAN BOARD ── */}
      <Box sx={{ flex: 1, overflowX: "auto", p: 2 }}>
        {loading ? (
          <Box display="flex" gap={2}>
            {COLUMNS.map(s => (
              <Box key={s} sx={{ minWidth: 220 }}>
                <Skeleton variant="rectangular" height={48} sx={{ borderRadius: "10px 10px 0 0", mb: 0.5 }} />
                {[1, 2].map(i => <Skeleton key={i} variant="rectangular" height={90} sx={{ mb: 1, borderRadius: 2 }} />)}
              </Box>
            ))}
          </Box>
        ) : (
          <Box display="flex" gap={2} sx={{ minHeight: "calc(100vh - 160px)", alignItems: "flex-start" }}>
            {COLUMNS.map(status => (
              <KanbanColumn
                key={status}
                status={status}
                appointments={byStatus(status)}
                onStatusChange={handleStatusChange}
                onViewRecord={setRecordApt}
                doctorColorMap={doctorColorMap}
              />
            ))}
          </Box>
        )}
      </Box>

      {openNew && (
        <ClinicNewAppointment
          open={openNew}
          onClose={() => setOpenNew(false)}
          onCreated={(apt) => { setAppointments(prev => [...prev, apt]); setOpenNew(false); }}
          token={token}
          claims={claims}
        />
      )}

      {recordApt && (
        <ClinicRecordModal
          open={Boolean(recordApt)}
          appointment={recordApt}
          onClose={() => setRecordApt(null)}
          token={token}
          claims={claims}
        />
      )}
    </Box>
  );
}
