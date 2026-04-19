import React, { useState, useEffect } from "react";
import { useParams, useOutletContext, useNavigate } from "react-router-dom";
import { Box, CircularProgress, Button, Typography } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import HojaClinicaTemplate, { PRINT_STYLE, INITIAL_FORM } from "../clinic/HojaClinicaTemplate";

const CLINIC_API = import.meta.env.VITE_CLINIC_API_URL || "";

export default function PatientFormView() {
  const { entryId } = useParams();
  const { token }   = useOutletContext();
  const navigate    = useNavigate();

  const [entry,   setEntry]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!document.getElementById("pfv-print-style")) {
      const tag = document.createElement("style");
      tag.id    = "pfv-print-style";
      tag.innerHTML = PRINT_STYLE;
      document.head.appendChild(tag);
    }

    fetch(`${CLINIC_API}/clinic/portal/form-entries/${entryId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error("No encontrada"); return r.json(); })
      .then(setEntry)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [entryId, token]);

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}><CircularProgress /></Box>;
  if (error)   return <Box sx={{ p: 3 }}><Typography color="error">{error}</Typography></Box>;

  const date = entry?.created_at
    ? new Date(entry.created_at).toLocaleDateString("es-MX", { dateStyle: "long" })
    : "";

  // Merge saved form_data with empty defaults so template renders safely
  const form = { ...INITIAL_FORM, ...(entry?.form_data || {}) };

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 1, md: 2 } }}>
      {/* ── Top bar ── */}
      <Box className="no-print" sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} variant="outlined" size="small">
          Regresar
        </Button>
        <Typography variant="h6" fontWeight={800} sx={{ flex: 1, ml: 1, fontSize: { xs: 14, md: 18 } }}>
          Hoja Clínica — {date}
        </Typography>
        <Button
          startIcon={<PrintIcon />}
          onClick={() => window.print()}
          variant="contained"
          size="small"
          sx={{ bgcolor: "#c0005a", "&:hover": { bgcolor: "#a0004a" } }}
        >
          Imprimir
        </Button>
      </Box>

      {/* ── Read-only clinical form ── */}
      <HojaClinicaTemplate
        form={form}
        onChange={() => {}}
        onRadio={() => {}}
        readOnly
      />
    </Box>
  );
}
