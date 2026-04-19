import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Box, Typography, Paper, Skeleton, Accordion, AccordionSummary,
  AccordionDetails, Chip, Tabs, Tab, Divider,
} from "@mui/material";
import FolderSharedIcon from "@mui/icons-material/FolderShared";
import DescriptionIcon from "@mui/icons-material/Description";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const CLINIC_API = import.meta.env.VITE_CLINIC_API_URL || import.meta.env.VITE_API_URL || "";

// ── Shared row component ──────────────────────────────────────────────────────
function Row({ label, value }) {
  if (!value) return null;
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 1, py: 0.8, borderBottom: "1px solid #f3f4f6" }}>
      <Typography fontSize={12} color="text.secondary" fontWeight={600}>{label}</Typography>
      <Typography fontSize={13} sx={{ whiteSpace: "pre-wrap" }}>{value}</Typography>
    </Box>
  );
}

// ── Hoja Clínica read-only summary ────────────────────────────────────────────
function HojaCard({ entry }) {
  const d = entry.form_data || {};
  const date = entry.created_at
    ? new Date(entry.created_at).toLocaleDateString("es-MX", { dateStyle: "long" })
    : `Hoja #${entry.id}`;

  return (
    <Accordion elevation={0}
      sx={{ border: "1px solid #e5e7eb", borderRadius: "12px !important", mb: 1.5, "&:before": { display: "none" } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
          <DescriptionIcon sx={{ color: "#4361ee", fontSize: 20 }} />
          <Typography fontWeight={700} fontSize={14}>{date}</Typography>
          <Chip label="Hoja Neurológica" size="small" sx={{ bgcolor: "#eff2ff", color: "#4361ee", ml: "auto" }} />
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2.5, pb: 2.5 }}>
        {/* Signos vitales */}
        {(d.fc || d.ta || d.tc) && (
          <Box mb={1.5}>
            <Typography fontSize={11} fontWeight={700} color="#4361ee" textTransform="uppercase" mb={0.5}>
              Signos Vitales
            </Typography>
            <Row label="F/C" value={d.fc} />
            <Row label="T/A" value={d.ta} />
            <Row label="T/C" value={d.tc} />
          </Box>
        )}

        {/* Historia clínica */}
        {(d.motivo || d.app || d.alergias || d.medicamentos) && (
          <Box mb={1.5}>
            <Typography fontSize={11} fontWeight={700} color="#4361ee" textTransform="uppercase" mb={0.5}>
              Historia Clínica
            </Typography>
            <Row label="Motivo de consulta" value={d.motivo} />
            <Row label="APP" value={d.app} />
            <Row label="Alergias" value={d.alergias} />
            <Row label="Medicamentos" value={d.medicamentos} />
          </Box>
        )}

        {/* Objetivos y plan */}
        {d.objetivos && (
          <Box mb={1.5}>
            <Typography fontSize={11} fontWeight={700} color="#4361ee" textTransform="uppercase" mb={0.5}>
              Plan de Tratamiento
            </Typography>
            <Row label="Objetivos / Plan" value={d.objetivos} />
          </Box>
        )}

        {/* SOAP */}
        {(d.soap_s || d.soap_o || d.soap_a || d.soap_p) && (
          <Box mb={1.5}>
            <Typography fontSize={11} fontWeight={700} color="#4361ee" textTransform="uppercase" mb={0.5}>
              Nota SOAP
            </Typography>
            <Row label="Subjetivo" value={d.soap_s} />
            <Row label="Objetivo" value={d.soap_o} />
            <Row label="Análisis" value={d.soap_a} />
            <Row label="Plan" value={d.soap_p} />
          </Box>
        )}

        {/* Escalas */}
        {d.ais && (
          <Box mb={1.5}>
            <Typography fontSize={11} fontWeight={700} color="#4361ee" textTransform="uppercase" mb={0.5}>
              ISNCSCI
            </Typography>
            <Row label="NLI" value={d.nli} />
            <Row label="AIS" value={d.ais} />
            <Row label="Completa/Incompleta" value={d.complete_incomplete} />
          </Box>
        )}

        {/* Notas interconsulta */}
        {d.notas_interconsulta && (
          <Box mb={1.5}>
            <Typography fontSize={11} fontWeight={700} color="#4361ee" textTransform="uppercase" mb={0.5}>
              Notas Interconsulta
            </Typography>
            <Row label="" value={d.notas_interconsulta} />
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PatientRecords() {
  const { token } = useOutletContext();
  const [records, setRecords] = useState([]);
  const [hojas, setHojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${CLINIC_API}/clinic/portal/records`, { headers }).then(r => r.json()).catch(() => ({ records: [] })),
      fetch(`${CLINIC_API}/clinic/portal/form-entries`, { headers }).then(r => r.json()).catch(() => ({ entries: [] })),
    ]).then(([rData, fData]) => {
      setRecords(rData.records || []);
      setHojas(fData.entries || []);
    }).finally(() => setLoading(false));
  }, [token]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
        <FolderSharedIcon sx={{ color: "#4361ee" }} />
        <Typography variant="h6" fontWeight={800}>Mi Expediente</Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: "1px solid #e5e7eb" }}>
        <Tab label={`Notas clínicas${records.length ? ` (${records.length})` : ""}`} />
        <Tab label={`Hojas clínicas${hojas.length ? ` (${hojas.length})` : ""}`} />
      </Tabs>

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={80} sx={{ borderRadius: 2, mb: 1 }} />
        ))
      ) : tab === 0 ? (
        records.length === 0 ? (
          <Typography color="text.secondary" fontSize={14} textAlign="center" mt={6}>
            No hay notas clínicas todavía.
          </Typography>
        ) : (
          records.map((r, i) => (
            <Accordion key={r.id} defaultExpanded={i === 0} elevation={0}
              sx={{ border: "1px solid #e5e7eb", borderRadius: "12px !important", mb: 1.5, "&:before": { display: "none" } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
                  <Typography fontWeight={700} fontSize={14}>
                    {r.record_date
                      ? new Date(r.record_date).toLocaleDateString("es-MX", { dateStyle: "long" })
                      : `Registro #${r.id}`}
                  </Typography>
                  {r.diagnosis && (
                    <Chip label={r.diagnosis.slice(0, 30)} size="small" sx={{ bgcolor: "#eff2ff", color: "#4361ee" }} />
                  )}
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
        )
      ) : (
        hojas.length === 0 ? (
          <Box sx={{ textAlign: "center", mt: 6, px: 2 }}>
            <DescriptionIcon sx={{ fontSize: 48, color: "#c7d2fe", mb: 1.5 }} />
            <Typography color="text.secondary" fontSize={14} fontWeight={600}>
              Sin hojas clínicas todavía
            </Typography>
            <Typography color="text.secondary" fontSize={13} mt={0.5}>
              Tu doctor las agregará a tu expediente después de cada consulta.
            </Typography>
          </Box>
        ) : (
          hojas.map(e => <HojaCard key={e.id} entry={e} />)
        )
      )}
    </Box>
  );
}
