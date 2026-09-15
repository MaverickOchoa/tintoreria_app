import React, { useState, useEffect } from "react";
import { useParams, useOutletContext, useNavigate } from "react-router-dom";
import { Box, CircularProgress, Button, Typography, Alert, Chip } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import DownloadIcon from "@mui/icons-material/Download";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const CLINIC_API = import.meta.env.VITE_CLINIC_API_URL || "";

export default function PatientFormView() {
  const { entryId } = useParams();
  const { token }   = useOutletContext();
  const navigate    = useNavigate();

  const [entry,    setEntry]    = useState(null);
  const [template, setTemplate] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [tab,      setTab]      = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`${CLINIC_API}/clinic/portal/form-entries/${entryId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error("No encontrada");
        const e = await r.json();
        setEntry(e);

        // If it has a template, load pages for read-only overlay view
        if (e.template_id) {
          const tr = await fetch(`${CLINIC_API}/api/v2/clinic/form-templates/${e.template_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (tr.ok) setTemplate(await tr.json());
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [entryId, token]);

  if (loading) return (
    <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
      <CircularProgress sx={{ color: "#c0005a" }} />
    </Box>
  );
  if (error) return (
    <Box sx={{ p: 3 }}>
      <Typography color="error">{error}</Typography>
    </Box>
  );

  const date = entry?.created_at
    ? new Date(entry.created_at).toLocaleDateString("es-MX", { dateStyle: "long" })
    : "";

  const filledUrl   = entry?.filled_pdf_url;
  const pages       = template?.pages_urls || [];
  const fieldMap    = template?.field_map  || [];
  const formData    = entry?.form_data     || {};
  const fieldsForPage = (idx) => fieldMap.filter(f => f.page === idx);

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 1, md: 2 } }}>
      {/* Top bar */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} variant="outlined" size="small">
          Regresar
        </Button>
        <Typography variant="h6" fontWeight={800} sx={{ flex: 1, ml: 1, fontSize: { xs: 14, md: 18 } }}>
          {template?.name || "Hoja Clínica"} — {date}
        </Typography>
        {filledUrl ? (
          <Button
            startIcon={<DownloadIcon />}
            href={filledUrl}
            target="_blank"
            variant="contained"
            size="small"
            sx={{ bgcolor: "#c0005a", "&:hover": { bgcolor: "#a0004a" } }}
          >
            Descargar PDF
          </Button>
        ) : (
          <Button
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
            variant="contained"
            size="small"
            sx={{ bgcolor: "#c0005a", "&:hover": { bgcolor: "#a0004a" } }}
          >
            Imprimir
          </Button>
        )}
      </Box>

      {/* Show filled PDF as embed if generated */}
      {filledUrl && (
        <Box sx={{ mb: 2 }}>
          <Chip label="PDF generado por el médico" size="small"
            sx={{ bgcolor: "#fce4ec", color: "#c0005a", mb: 1, fontWeight: 700 }} />
          <Box sx={{ border: "2px solid #f48fb1", borderRadius: 2, overflow: "hidden", height: { xs: 500, md: 700 } }}>
            <iframe src={filledUrl} width="100%" height="100%" style={{ border: "none" }} title="Hoja clínica" />
          </Box>
        </Box>
      )}

      {/* If no filled PDF but has template, show read-only overlay view */}
      {!filledUrl && pages.length > 0 && (
        <>
          {pages.length > 1 && (
            <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
              {pages.map((_, i) => (
                <Button
                  key={i}
                  size="small"
                  variant={tab === i ? "contained" : "outlined"}
                  onClick={() => setTab(i)}
                  sx={{
                    bgcolor: tab === i ? "#c0005a" : undefined,
                    borderColor: "#c0005a", color: tab === i ? "#fff" : "#c0005a",
                    "&:hover": { bgcolor: tab === i ? "#a0004a" : "#fce4ec" },
                  }}
                >
                  Pág. {i + 1}
                </Button>
              ))}
            </Box>
          )}
          <Box sx={{ border: "2px solid #f48fb1", borderRadius: 2, overflow: "hidden", position: "relative" }}>
            <img
              src={pages[tab]}
              alt={`Página ${tab + 1}`}
              style={{ width: "100%", display: "block" }}
            />
            {fieldsForPage(tab).map(f => (
              <Box
                key={f.key}
                sx={{
                  position: "absolute",
                  left: `${f.x}%`, top: `${f.y}%`,
                  width: `${f.w}%`, height: `${f.h}%`,
                  display: "flex", alignItems: "center",
                  fontSize: `${Math.max(9, Math.min(13, f.h * 0.4))}px`,
                  fontFamily: "Arial, sans-serif",
                  color: "#111",
                  overflow: "hidden",
                  px: "3px",
                }}
              >
                {formData[f.key] || ""}
              </Box>
            ))}
          </Box>
        </>
      )}

      {/* Fallback if no template */}
      {!filledUrl && pages.length === 0 && (
        <Alert severity="info">
          El médico aún no ha completado ni generado este formulario.
        </Alert>
      )}
    </Box>
  );
}
