import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Box, Typography, Paper, Skeleton, Accordion, AccordionSummary, AccordionDetails, Chip } from "@mui/material";
import FolderSharedIcon from "@mui/icons-material/FolderShared";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const CLINIC_API = import.meta.env.VITE_CLINIC_API_URL || import.meta.env.VITE_API_URL || "";

export default function PatientRecords() {
  const { token } = useOutletContext();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${CLINIC_API}/clinic/portal/records`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setRecords(d.records || []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [token]);

  const Row = ({ label, value }) => value ? (
    <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 1, py: 0.8, borderBottom: "1px solid #f3f4f6" }}>
      <Typography fontSize={12} color="text.secondary" fontWeight={600}>{label}</Typography>
      <Typography fontSize={13}>{value}</Typography>
    </Box>
  ) : null;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <FolderSharedIcon sx={{ color: "#4361ee" }} />
        <Typography variant="h6" fontWeight={800}>Mi Expediente</Typography>
      </Box>

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={80} sx={{ borderRadius: 2, mb: 1 }} />)
      ) : records.length === 0 ? (
        <Typography color="text.secondary" fontSize={14} textAlign="center" mt={6}>No hay registros clínicos todavía.</Typography>
      ) : (
        records.map((r, i) => (
          <Accordion key={r.id} defaultExpanded={i === 0} elevation={0}
            sx={{ border: "1px solid #e5e7eb", borderRadius: "12px !important", mb: 1.5, "&:before": { display: "none" } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
                <Typography fontWeight={700} fontSize={14}>
                  {r.record_date ? new Date(r.record_date).toLocaleDateString("es-MX", { dateStyle: "long" }) : `Registro #${r.id}`}
                </Typography>
                {r.diagnosis && <Chip label={r.diagnosis.slice(0, 30)} size="small" sx={{ bgcolor: "#eff2ff", color: "#4361ee" }} />}
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 2.5, pb: 2.5 }}>
              <Row label="Motivo de consulta" value={r.chief_complaint} />
              <Row label="Diagnóstico" value={r.diagnosis} />
              <Row label="Tratamiento" value={r.treatment} />
              <Row label="Receta" value={r.prescription} />
              <Row label="Signos vitales" value={r.vital_signs} />
              <Row label="Próxima cita" value={r.next_appointment_notes} />
            </AccordionDetails>
          </Accordion>
        ))
      )}
    </Box>
  );
}
