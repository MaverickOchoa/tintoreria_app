import React, { useState, useEffect, useCallback } from "react";
import { useParams, useOutletContext, useNavigate, useSearchParams } from "react-router-dom";
import {
  Box, Button, Typography, CircularProgress, Alert, Snackbar,
  Tabs, Tab, LinearProgress, Chip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DownloadIcon from "@mui/icons-material/Download";
import { CLINIC_API } from "./clinicTheme";

const C = { rose: "#c0005a", pink: "#f48fb1", pinkBg: "#fce4ec" };

// Map field type → input attributes
const inputProps = (type) => {
  if (type === "date")     return { type: "date" };
  if (type === "number")   return { type: "number" };
  if (type === "textarea") return { as: "textarea" };
  return { type: "text" };
};

// ─── One page with overlaid inputs ───────────────────────────────────────────
function PageViewer({ pageUrl, pageIndex, fields, formData, onChange, readOnly }) {
  return (
    <Box sx={{ position: "relative", width: "100%" }}>
      <img
        src={pageUrl}
        alt={`Página ${pageIndex + 1}`}
        style={{ width: "100%", display: "block" }}
        draggable={false}
      />
      {fields.map((f) => {
        const isTextarea = f.type === "textarea";
        const commonStyle = {
          position: "absolute",
          left:   `${f.x}%`,
          top:    `${f.y}%`,
          width:  `${f.w}%`,
          height: `${f.h}%`,
          background: readOnly ? "transparent" : "rgba(255,255,255,0.85)",
          border: readOnly ? "none" : `1px solid ${C.pink}`,
          borderRadius: 2,
          padding: "1px 3px",
          fontSize: `${Math.max(9, Math.min(13, f.h * 0.4))}px`,
          fontFamily: "Arial, sans-serif",
          color: "#111",
          outline: "none",
          boxSizing: "border-box",
          resize: "none",
          lineHeight: "1.2",
        };

        return isTextarea ? (
          <textarea
            key={f.key}
            value={formData[f.key] || ""}
            onChange={e => !readOnly && onChange(f.key, e.target.value)}
            readOnly={readOnly}
            placeholder={readOnly ? "" : f.label}
            title={f.label}
            style={{ ...commonStyle, overflowY: "hidden" }}
          />
        ) : (
          <input
            key={f.key}
            {...inputProps(f.type)}
            value={formData[f.key] || ""}
            onChange={e => !readOnly && onChange(f.key, e.target.value)}
            readOnly={readOnly}
            placeholder={readOnly ? "" : f.label}
            title={f.label}
            style={commonStyle}
          />
        );
      })}
    </Box>
  );
}

// ─── Main FormViewer ──────────────────────────────────────────────────────────
export default function FormViewer() {
  const { templateId, entryId } = useParams();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patient_id");
  const appointmentId = searchParams.get("appointment_id");

  const { token } = useOutletContext();
  const navigate = useNavigate();

  const [template, setTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [tab, setTab]           = useState(0);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [generating, setGenerating] = useState(false);
  const [entryIdState, setEntryIdState] = useState(entryId || null);
  const [filledUrl, setFilledUrl] = useState(null);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load template
        const tr = await fetch(`${CLINIC_API}/clinic/form-templates/${templateId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const t = await tr.json();
        setTemplate(t);

        // Load existing entry if present
        if (entryId) {
          const er = await fetch(`${CLINIC_API}/clinic/form-entries/${entryId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (er.ok) {
            const e = await er.json();
            setFormData(e.form_data || {});
            setFilledUrl(e.filled_pdf_url || null);
          }
        }
      } catch (err) {
        setSnack({ open: true, msg: "Error cargando formulario", severity: "error" });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [templateId, entryId, token]);

  const handleChange = useCallback((key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const save = async (andGenerate = false) => {
    setSaving(true);
    try {
      let eid = entryIdState;

      if (!eid) {
        // Create new entry
        const r = await fetch(`${CLINIC_API}/clinic/form-entries`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            template_id: parseInt(templateId),
            patient_id: patientId ? parseInt(patientId) : null,
            appointment_id: appointmentId ? parseInt(appointmentId) : null,
            form_data: formData,
            status: andGenerate ? "final" : "draft",
          }),
        });
        if (!r.ok) throw new Error(await r.text());
        const created = await r.json();
        eid = created.id;
        setEntryIdState(eid);
      } else {
        // Update existing
        const r = await fetch(`${CLINIC_API}/clinic/form-entries/${eid}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            form_data: formData,
            status: andGenerate ? "final" : "draft",
          }),
        });
        if (!r.ok) throw new Error(await r.text());
      }

      if (andGenerate) {
        setGenerating(true);
        const r = await fetch(`${CLINIC_API}/clinic/form-entries/${eid}/generate-pdf`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error(await r.text());
        const result = await r.json();
        setFilledUrl(result.filled_pdf_url);
        setSnack({ open: true, msg: "PDF generado y guardado en el expediente del paciente", severity: "success" });
      } else {
        setSnack({ open: true, msg: "Borrador guardado correctamente", severity: "success" });
      }
    } catch (e) {
      setSnack({ open: true, msg: "Error: " + e.message, severity: "error" });
    } finally {
      setSaving(false);
      setGenerating(false);
    }
  };

  if (loading) return (
    <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
      <CircularProgress sx={{ color: C.rose }} />
    </Box>
  );

  if (!template) return <Alert severity="error">Formulario no encontrado</Alert>;

  const pages = template.pages_urls || [];
  const fieldMap = template.field_map || [];
  const fieldsForPage = (idx) => fieldMap.filter(f => f.page === idx);

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 1, md: 2 } }}>
      {/* Toolbar */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          variant="outlined"
          size="small"
        >
          Regresar
        </Button>
        <Typography variant="h6" fontWeight={800} color={C.rose} sx={{ flex: 1 }}>
          {template.name}
        </Typography>
        {entryIdState && (
          <Chip
            label="Borrador guardado"
            size="small"
            sx={{ bgcolor: C.pinkBg, color: C.rose, fontSize: 11 }}
          />
        )}
        {filledUrl && (
          <Button
            startIcon={<DownloadIcon />}
            href={filledUrl}
            target="_blank"
            variant="outlined"
            size="small"
            sx={{ borderColor: C.rose, color: C.rose }}
          >
            Descargar PDF
          </Button>
        )}
        <Button
          startIcon={<SaveIcon />}
          onClick={() => save(false)}
          disabled={saving || generating}
          variant="outlined"
          size="small"
          sx={{ borderColor: C.rose, color: C.rose }}
        >
          {saving && !generating ? "Guardando…" : "Guardar borrador"}
        </Button>
        <Button
          startIcon={<PictureAsPdfIcon />}
          onClick={() => save(true)}
          disabled={saving || generating}
          variant="contained"
          size="small"
          sx={{ bgcolor: C.rose, "&:hover": { bgcolor: "#a0004a" } }}
        >
          {generating ? "Generando PDF…" : "Guardar en expediente"}
        </Button>
      </Box>

      {(saving || generating) && (
        <LinearProgress sx={{ mb: 2, "& .MuiLinearProgress-bar": { bgcolor: C.rose } }} />
      )}

      {/* Page tabs */}
      {pages.length > 1 && (
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 1, "& .Mui-selected": { color: C.rose }, "& .MuiTabs-indicator": { bgcolor: C.rose } }}
        >
          {pages.map((_, i) => (
            <Tab key={i} label={`Página ${i + 1}`} />
          ))}
        </Tabs>
      )}

      {/* PDF page with inputs */}
      {pages.length > 0 ? (
        <Box sx={{ border: `2px solid ${C.pink}`, borderRadius: 2, overflow: "hidden" }}>
          <PageViewer
            pageUrl={pages[tab]}
            pageIndex={tab}
            fields={fieldsForPage(tab)}
            formData={formData}
            onChange={handleChange}
            readOnly={false}
          />
        </Box>
      ) : (
        <Alert severity="warning">
          Este formulario no tiene páginas configuradas. El administrador debe subir el PDF primero.
        </Alert>
      )}

      {fieldMap.length === 0 && pages.length > 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Este formulario no tiene campos configurados todavía. El administrador debe configurar los campos en el editor.
        </Alert>
      )}

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
