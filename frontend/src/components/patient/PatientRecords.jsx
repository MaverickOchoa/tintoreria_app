import React, { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, Skeleton, Accordion, AccordionSummary,
  AccordionDetails, Chip, Tabs, Tab, Button,
} from "@mui/material";
import FolderSharedIcon from "@mui/icons-material/FolderShared";
import DescriptionIcon from "@mui/icons-material/Description";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

const CLINIC_API = import.meta.env.VITE_CLINIC_API_URL || "";

function Row({ label, value }) {
  if (!value) return null;
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 1, py: 0.8, borderBottom: "1px solid #f3f4f6" }}>
      <Typography fontSize={12} color="text.secondary" fontWeight={600}>{label}</Typography>
      <Typography fontSize={13} sx={{ whiteSpace: "pre-wrap" }}>{value}</Typography>
    </Box>
  );
}

export default function PatientRecords() {
  const { token } = useOutletContext();
  const navigate = useNavigate();
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
          <Skeleton key={i} height={72} sx={{ borderRadius: 2, mb: 1 }} />
        ))
      ) : tab === 0 ? (
        /* ── Notas clínicas */
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
                <Row label="Próxima cita" value={r.next_appointment_notes} />
              </AccordionDetails>
            </Accordion>
          ))
        )
      ) : (
        /* ── Hojas clínicas */
        hojas.length === 0 ? (
          <Box sx={{ textAlign: "center", mt: 6, px: 2 }}>
            <DescriptionIcon sx={{ fontSize: 52, color: "#c7d2fe", mb: 1.5 }} />
            <Typography color="text.secondary" fontSize={14} fontWeight={600}>
              Sin hojas clínicas todavía
            </Typography>
            <Typography color="text.secondary" fontSize={13} mt={0.5}>
              Tu médico las agregará a tu expediente después de cada consulta.
            </Typography>
          </Box>
        ) : (
          hojas.map(e => {
            const date = e.created_at
              ? new Date(e.created_at).toLocaleDateString("es-MX", { dateStyle: "long" })
              : `Hoja #${e.id}`;
            return (
              <Paper
                key={e.id}
                elevation={0}
                sx={{
                  display: "flex", alignItems: "center", gap: 2, p: 2.5, mb: 1.5,
                  border: "1px solid #c7d2fe", borderRadius: 3, cursor: "pointer",
                  bgcolor: "#f8f9ff",
                  "&:hover": { boxShadow: 3, borderColor: "#4361ee", bgcolor: "#eff2ff" },
                  transition: "all 0.15s",
                }}
                onClick={() => navigate(`/patient/records/${e.id}`)}
              >
                <DescriptionIcon sx={{ color: "#4361ee", fontSize: 32, flexShrink: 0 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={800} fontSize={14}>{date}</Typography>
                  <Typography fontSize={12} color="text.secondary">
                    {e.form_type === "neurologica" ? "Hoja Clínica Neurológica" : e.form_type}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  endIcon={<OpenInNewIcon />}
                  variant="contained"
                  sx={{ bgcolor: "#4361ee", borderRadius: 2, fontWeight: 700, fontSize: 12, flexShrink: 0 }}
                  onClick={ev => { ev.stopPropagation(); navigate(`/patient/records/${e.id}`); }}
                >
                  Ver hoja
                </Button>
              </Paper>
            );
          })
        )
      )}
    </Box>
  );
}
