import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Button, TextField, Typography, Grid, Divider,
  Chip, CircularProgress, Alert, Accordion, AccordionSummary, AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { CLINIC_API } from "./clinicTheme";

const EMPTY = {
  chief_complaint: "", diagnosis: "", treatment: "",
  prescription: "", vital_signs: "", next_appointment_notes: "",
};

export default function ClinicRecordModal({ open, appointment, onClose, token, claims }) {
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open || !appointment?.patient_id) return;
    setLoading(true);
    fetch(`${CLINIC_API}/clinic/patients/${appointment.patient_id}/records`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setRecords(Array.isArray(d.records) ? d.records : []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [open, appointment?.patient_id]);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch(`${CLINIC_API}/clinic/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          patient_id: appointment.patient_id,
          appointment_id: appointment.id,
          branch_id: appointment.branch_id,
        }),
      });
      if (!r.ok) throw new Error("Error al guardar");
      const rec = await r.json();
      setRecords(prev => [rec, ...prev]);
      setForm(EMPTY);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800, fontSize: 18 }}>
        Expediente Clínico — {appointment?.patient_name || "Paciente"}
        <Typography variant="caption" color="text.secondary" display="block">
          Cita: {appointment?.service_name || "—"} · {appointment?.scheduled_at
            ? new Date(appointment.scheduled_at).toLocaleDateString("es-MX", { dateStyle: "medium" })
            : ""}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>Expediente guardado correctamente</Alert>}

        {/* Nueva nota */}
        <Typography fontWeight={700} fontSize={15} mb={1.5}>Nueva nota clínica</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Signos vitales" placeholder="Temp, TA, FC, etc." value={form.vital_signs}
              onChange={e => setF("vital_signs", e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Motivo de consulta" value={form.chief_complaint}
              onChange={e => setF("chief_complaint", e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline minRows={2} label="Diagnóstico" value={form.diagnosis}
              onChange={e => setF("diagnosis", e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline minRows={2} label="Tratamiento" value={form.treatment}
              onChange={e => setF("treatment", e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline minRows={2} label="Prescripción / Receta" value={form.prescription}
              onChange={e => setF("prescription", e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Notas para siguiente cita" value={form.next_appointment_notes}
              onChange={e => setF("next_appointment_notes", e.target.value)} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Historial */}
        <Typography fontWeight={700} fontSize={15} mb={1.5}>
          Historial ({records.length} notas)
        </Typography>

        {loading ? (
          <Box textAlign="center" py={2}><CircularProgress size={24} /></Box>
        ) : records.length === 0 ? (
          <Typography color="text.secondary" fontSize={13}>Sin notas previas para este paciente.</Typography>
        ) : (
          records.map(rec => (
            <Accordion key={rec.id} disableGutters elevation={0}
              sx={{ border: "1px solid #e8eaed", borderRadius: "8px !important", mb: 1, "&:before": { display: "none" } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <Typography fontSize={13} fontWeight={600}>
                    {rec.record_date
                      ? new Date(rec.record_date).toLocaleDateString("es-MX", { dateStyle: "medium" })
                      : "—"}
                  </Typography>
                  {rec.diagnosis && (
                    <Chip label={rec.diagnosis.slice(0, 40) + (rec.diagnosis.length > 40 ? "…" : "")}
                      size="small" sx={{ fontSize: 11, bgcolor: "#eef0fd", color: "#4361ee" }} />
                  )}
                  {rec.doctor_name && (
                    <Chip label={rec.doctor_name} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ bgcolor: "#fafbfc", borderTop: "1px solid #f0f2f5" }}>
                <Grid container spacing={1.5}>
                  {[
                    ["Signos vitales", rec.vital_signs],
                    ["Motivo", rec.chief_complaint],
                    ["Diagnóstico", rec.diagnosis],
                    ["Tratamiento", rec.treatment],
                    ["Prescripción", rec.prescription],
                    ["Notas próxima cita", rec.next_appointment_notes],
                  ].filter(([, v]) => v).map(([label, val]) => (
                    <Grid item xs={12} sm={6} key={label}>
                      <Typography fontSize={11} color="text.secondary" fontWeight={600}>{label}</Typography>
                      <Typography fontSize={13}>{val}</Typography>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cerrar</Button>
        <Button variant="contained" disabled={saving} onClick={handleSave}
          sx={{ bgcolor: "#4361ee", "&:hover": { bgcolor: "#3251d3" }, fontWeight: 700, borderRadius: 2 }}>
          {saving ? <CircularProgress size={18} color="inherit" /> : "Guardar Nota"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
