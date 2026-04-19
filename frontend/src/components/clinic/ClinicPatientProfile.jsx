import React, { useState, useEffect } from "react";
import { useParams, useOutletContext, useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Paper, Grid, Chip, Avatar, Divider,
  Accordion, AccordionSummary, AccordionDetails, Skeleton, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import DescriptionIcon from "@mui/icons-material/Description";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DraftIcon from "@mui/icons-material/EditNote";
import { CLINIC_API, STATUS_CONFIG } from "./clinicTheme";

function InfoRow({ label, value }) {
  return (
    <Grid item xs={12} sm={6}>
      <Typography fontSize={11} color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
        {label}
      </Typography>
      <Typography fontSize={14}>{value || <span style={{ color: "#bbb" }}>—</span>}</Typography>
    </Grid>
  );
}

export default function ClinicPatientProfile() {
  const { patientId } = useParams();
  const { token } = useOutletContext();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [records, setRecords] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [formEntries, setFormEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    const safe = (p) => p.then(r => r.ok ? r.json() : {}).catch(() => ({}));
    Promise.all([
      safe(fetch(`${CLINIC_API}/clinic/patients/${patientId}`, { headers })),
      safe(fetch(`${CLINIC_API}/clinic/patients/${patientId}/records`, { headers })),
      safe(fetch(`${CLINIC_API}/clinic/appointments?patient_id=${patientId}`, { headers })),
      safe(fetch(`${CLINIC_API}/clinic/patients/${patientId}/form-entries`, { headers })),
    ]).then(([p, rec, apt, fe]) => {
      setPatient(p?.id ? p : null);
      setRecords(rec.records || []);
      setAppointments(apt.appointments || []);
      setFormEntries(fe.entries || []);
    }).finally(() => setLoading(false));
  }, [patientId, token]);

  const openEdit = () => {
    setEditForm({
      blood_type: patient?.blood_type || "",
      allergies: patient?.allergies || "",
      emergency_contact_name: patient?.emergency_contact_name || "",
      emergency_contact_phone: patient?.emergency_contact_phone || "",
      occupation: patient?.occupation || "",
      medical_history: patient?.medical_history || "",
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const r = await fetch(`${CLINIC_API}/clinic/patients/${patientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm),
      });
      if (r.ok) { const updated = await r.json(); setPatient(updated); setEditOpen(false); }
    } catch {}
    setSaving(false);
  };

  if (loading) return (
    <Box p={3}><Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3, mb: 2 }} />
      {[1, 2, 3].map(i => <Skeleton key={i} variant="rectangular" height={60} sx={{ borderRadius: 2, mb: 1 }} />)}</Box>
  );

  if (!patient) return (
    <Box p={3}><Typography>Paciente no encontrado.</Typography>
      <Button onClick={() => navigate("/clinic/patients")}>Regresar</Button></Box>
  );

  const name = `${patient.full_name || ""} ${patient.last_name || ""}`.trim();
  const initial = (name[0] || "?").toUpperCase();

  return (
    <Box sx={{ height: "100%", overflow: "auto" }}>
      {/* Header */}
      <Box sx={{ px: 3, py: 2, bgcolor: "#fff", borderBottom: "1px solid #e8eaed", display: "flex", alignItems: "center", gap: 2 }}>
        <IconButton onClick={() => navigate("/clinic/patients")} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Avatar sx={{ width: 44, height: 44, bgcolor: "#4361ee", fontSize: 18 }}>{initial}</Avatar>
        <Box>
          <Typography variant="h6" fontWeight={800}>{name}</Typography>
          <Typography variant="caption" color="text.secondary">{patient.phone} · {patient.email || "Sin email"}</Typography>
        </Box>
        <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
          {patient.blood_type && <Chip label={patient.blood_type} size="small" sx={{ bgcolor: "#fdecea", color: "#e63946", fontWeight: 700 }} />}
          {patient.allergies && <Chip label="Alergias" size="small" color="warning" variant="outlined" />}
          <Button startIcon={<EditIcon />} size="small" onClick={openEdit}
            sx={{ borderRadius: 2, border: "1px solid #e0e0e0" }}>
            Editar perfil clínico
          </Button>
          <Button
            startIcon={<DescriptionIcon />}
            size="small"
            variant="contained"
            onClick={() => navigate(`/clinic/patients/${patientId}/hoja-clinica`)}
            sx={{ borderRadius: 2, bgcolor: "#4361ee", "&:hover": { bgcolor: "#3251d3" }, fontWeight: 700 }}
          >
            Hoja Clínica
          </Button>
        </Box>
      </Box>

      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Left: clinical info + history */}
          <Grid item xs={12} md={8}>
            {/* Clinical info */}
            <Paper elevation={0} sx={{ border: "1px solid #e8eaed", borderRadius: 3, p: 2.5, mb: 3 }}>
              <Typography fontWeight={700} fontSize={15} mb={2}>Datos Clínicos</Typography>
              <Grid container spacing={2}>
                <InfoRow label="Tipo de sangre" value={patient.blood_type} />
                <InfoRow label="Ocupación" value={patient.occupation} />
                <InfoRow label="Alergias" value={patient.allergies} />
                <InfoRow label="Historial médico" value={patient.medical_history} />
                <InfoRow label="Contacto de emergencia" value={patient.emergency_contact_name} />
                <InfoRow label="Teléfono emergencia" value={patient.emergency_contact_phone} />
              </Grid>
            </Paper>

            {/* ── Hojas Clínicas ───────────────────────────── */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <Typography fontWeight={700} fontSize={15}>
                Hojas Clínicas ({formEntries.length})
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => navigate(`/clinic/patients/${patientId}/hoja-clinica`)}
                variant="contained"
                sx={{ ml: "auto", borderRadius: 2, bgcolor: "#4361ee", "&:hover": { bgcolor: "#3251d3" }, fontSize: 12 }}
              >
                Nueva hoja
              </Button>
            </Box>

            {formEntries.length === 0 ? (
              <Paper elevation={0} sx={{ border: "1px dashed #c7d2fe", borderRadius: 3, p: 3, textAlign: "center", mb: 3, bgcolor: "#f8f9ff" }}>
                <DescriptionIcon sx={{ color: "#c7d2fe", fontSize: 36, mb: 1 }} />
                <Typography color="text.secondary" fontSize={13}>
                  Sin hojas clínicas. Crea la primera con el botón "Nueva hoja".
                </Typography>
              </Paper>
            ) : (
              <Box sx={{ mb: 3 }}>
                {formEntries.map(entry => {
                  const isFinal = entry.status === "final";
                  const date = entry.created_at
                    ? new Date(entry.created_at).toLocaleDateString("es-MX", { dateStyle: "long" })
                    : `Hoja #${entry.id}`;
                  return (
                    <Paper
                      key={entry.id}
                      elevation={0}
                      onClick={() => navigate(`/clinic/patients/${patientId}/hoja-clinica?entry_id=${entry.id}`)}
                      sx={{
                        display: "flex", alignItems: "center", gap: 2, p: 2, mb: 1,
                        border: `1px solid ${isFinal ? "#bbf7d0" : "#e8eaed"}`,
                        borderRadius: 2, cursor: "pointer",
                        bgcolor: isFinal ? "#f0fdf4" : "#fff",
                        "&:hover": { boxShadow: 2, borderColor: "#4361ee" },
                        transition: "all 0.15s",
                      }}
                    >
                      <DescriptionIcon sx={{ color: isFinal ? "#16a34a" : "#9ca3af", fontSize: 28, flexShrink: 0 }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography fontSize={13} fontWeight={700}>{date}</Typography>
                        <Typography fontSize={11} color="text.secondary">
                          {entry.form_type === "neurologica" ? "Hoja Neurológica" : entry.form_type}
                        </Typography>
                      </Box>
                      <Chip
                        icon={isFinal ? <CheckCircleIcon sx={{ fontSize: "14px !important" }} /> : <DraftIcon sx={{ fontSize: "14px !important" }} />}
                        label={isFinal ? "En expediente" : "Borrador"}
                        size="small"
                        sx={{
                          bgcolor: isFinal ? "#dcfce7" : "#f3f4f6",
                          color: isFinal ? "#16a34a" : "#6b7280",
                          fontWeight: 700, fontSize: 11,
                        }}
                      />
                      <OpenInNewIcon sx={{ color: "#9ca3af", fontSize: 18 }} />
                    </Paper>
                  );
                })}
              </Box>
            )}

            {/* Clinical records */}
            <Typography fontWeight={700} fontSize={15} mb={1.5}>
              Notas Clínicas ({records.length})
            </Typography>
            {records.length === 0 ? (
              <Paper elevation={0} sx={{ border: "1px dashed #e0e0e0", borderRadius: 3, p: 3, textAlign: "center" }}>
                <Typography color="text.secondary" fontSize={13}>Sin notas clínicas registradas</Typography>
              </Paper>
            ) : (
              records.map(rec => (
                <Accordion key={rec.id} disableGutters elevation={0} sx={{
                  border: "1px solid #e8eaed", borderRadius: "8px !important",
                  mb: 1, "&:before": { display: "none" }
                }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                      <Typography fontSize={13} fontWeight={700}>
                        {rec.record_date ? new Date(rec.record_date).toLocaleDateString("es-MX", { dateStyle: "long" }) : "—"}
                      </Typography>
                      {rec.diagnosis && <Chip label={rec.diagnosis.slice(0, 35) + (rec.diagnosis.length > 35 ? "…" : "")}
                        size="small" sx={{ fontSize: 11, bgcolor: "#eef0fd", color: "#4361ee" }} />}
                      {rec.doctor_name && <Chip label={rec.doctor_name} size="small" variant="outlined" sx={{ fontSize: 11 }} />}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ bgcolor: "#fafbfc", borderTop: "1px solid #f0f2f5" }}>
                    <Grid container spacing={1.5}>
                      {[["Signos vitales", rec.vital_signs], ["Motivo", rec.chief_complaint],
                        ["Diagnóstico", rec.diagnosis], ["Tratamiento", rec.treatment],
                        ["Prescripción", rec.prescription], ["Próxima cita", rec.next_appointment_notes]
                      ].filter(([, v]) => v).map(([l, v]) => (
                        <Grid item xs={12} sm={6} key={l}>
                          <Typography fontSize={11} color="text.secondary" fontWeight={600}>{l}</Typography>
                          <Typography fontSize={13}>{v}</Typography>
                        </Grid>
                      ))}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </Grid>

          {/* Right: appointments */}
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ border: "1px solid #e8eaed", borderRadius: 3, p: 2.5 }}>
              <Typography fontWeight={700} fontSize={15} mb={2}>Historial de Citas ({appointments.length})</Typography>
              {appointments.length === 0 ? (
                <Typography color="text.secondary" fontSize={13}>Sin citas registradas</Typography>
              ) : (
                appointments.slice(0, 10).map(apt => {
                  const cfg = STATUS_CONFIG[apt.status] || STATUS_CONFIG["Agendada"];
                  return (
                    <Box key={apt.id} sx={{ mb: 1.5, pb: 1.5, borderBottom: "1px solid #f0f2f5" }}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography fontSize={13} fontWeight={600}>
                          {apt.scheduled_at ? new Date(apt.scheduled_at).toLocaleDateString("es-MX", { dateStyle: "short" }) : "—"}
                        </Typography>
                        <Chip label={apt.status} size="small"
                          sx={{ fontSize: 10, bgcolor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}44` }} />
                      </Box>
                      {apt.service_name && <Typography fontSize={12} color="text.secondary">{apt.service_name}</Typography>}
                      {apt.doctor_name && <Typography fontSize={11} color="text.disabled">Dr. {apt.doctor_name}</Typography>}
                    </Box>
                  );
                })
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Edit dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={800}>Editar Datos Clínicos</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {[
              ["blood_type", "Tipo de sangre"],
              ["occupation", "Ocupación"],
              ["allergies", "Alergias"],
              ["emergency_contact_name", "Contacto de emergencia"],
              ["emergency_contact_phone", "Teléfono emergencia"],
            ].map(([k, l]) => (
              <Grid item xs={12} sm={6} key={k}>
                <TextField fullWidth label={l} value={editForm[k] || ""} onChange={e => setEditForm(p => ({ ...p, [k]: e.target.value }))} />
              </Grid>
            ))}
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={3} label="Historial médico previo" value={editForm.medical_history || ""}
                onChange={e => setEditForm(p => ({ ...p, medical_history: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={saving} startIcon={<SaveIcon />} onClick={handleSaveEdit}
            sx={{ bgcolor: "#4361ee", "&:hover": { bgcolor: "#3251d3" }, borderRadius: 2, fontWeight: 700 }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
