import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useOutletContext, useNavigate } from "react-router-dom";
import {
  Box, Button, Typography, CircularProgress, Alert, Chip,
  TextField, MenuItem, Select, FormControl, InputLabel,
  IconButton, Tooltip, Snackbar, Paper, Tabs, Tab,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import { CLINIC_API } from "./clinicTheme";

const C = { rose: "#c0005a", pink: "#f48fb1", pinkBg: "#fce4ec" };

// ─── Field config dialog ──────────────────────────────────────────────────────
function FieldPopover({ field, onSave, onDelete, onClose }) {
  const [label, setLabel] = useState(field.label || "");
  const [key,   setKey]   = useState(field.key   || "");
  const [type,  setType]  = useState(field.type  || "text");

  return (
    <Paper
      elevation={8}
      sx={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        zIndex: 2000, p: 3, width: 320, borderRadius: 2, border: `2px solid ${C.pink}` }}
    >
      <Typography fontWeight={800} color={C.rose} mb={2}>Configurar campo</Typography>
      <TextField
        label="Etiqueta visible" value={label}
        onChange={e => setLabel(e.target.value)}
        fullWidth size="small" sx={{ mb: 2 }}
      />
      <TextField
        label="Nombre interno (clave)" value={key}
        onChange={e => setKey(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
        fullWidth size="small" sx={{ mb: 2 }}
        helperText="Ej: nombre_paciente, fecha, diagnostico"
      />
      <FormControl fullWidth size="small" sx={{ mb: 3 }}>
        <InputLabel>Tipo</InputLabel>
        <Select value={type} label="Tipo" onChange={e => setType(e.target.value)}>
          <MenuItem value="text">Texto</MenuItem>
          <MenuItem value="date">Fecha</MenuItem>
          <MenuItem value="number">Número</MenuItem>
          <MenuItem value="textarea">Texto largo</MenuItem>
        </Select>
      </FormControl>
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Button size="small" color="error" startIcon={<DeleteIcon />}
          onClick={() => { onDelete(); onClose(); }}>
          Eliminar
        </Button>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button size="small" onClick={onClose}>Cancelar</Button>
          <Button size="small" variant="contained"
            sx={{ bgcolor: C.rose, "&:hover": { bgcolor: "#a0004a" } }}
            startIcon={<CheckIcon />}
            onClick={() => { onSave({ ...field, label, key, type }); onClose(); }}>
            Guardar
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

// ─── One PDF page with draggable/resizable field overlays ─────────────────────
function PageEditor({ pageUrl, pageIndex, fields, onFieldsChange }) {
  const containerRef = useRef(null);
  const [editingField, setEditingField] = useState(null);
  const [drawing, setDrawing]           = useState(false);
  const [drawStart, setDrawStart]       = useState(null);
  const [drawRect, setDrawRect]         = useState(null);
  const [dragging, setDragging]         = useState(null); // { fieldKey, startX, startY, origX, origY }
  const [resizing, setResizing]         = useState(null);

  // Convert mouse event to % coordinates relative to container
  const toPercent = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width)  * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top)  / rect.height) * 100)),
    };
  }, []);

  // Mouse events for drawing new fields
  const handleMouseDown = useCallback((e) => {
    if (e.target !== containerRef.current && e.target.tagName === "IMG") {
      // Start drawing
      const pct = toPercent(e);
      setDrawing(true);
      setDrawStart(pct);
      setDrawRect({ x: pct.x, y: pct.y, w: 0, h: 0 });
    }
  }, [toPercent]);

  const handleMouseMove = useCallback((e) => {
    if (drawing && drawStart) {
      const pct = toPercent(e);
      setDrawRect({
        x: Math.min(pct.x, drawStart.x),
        y: Math.min(pct.y, drawStart.y),
        w: Math.abs(pct.x - drawStart.x),
        h: Math.abs(pct.y - drawStart.y),
      });
    }
    if (dragging) {
      const pct = toPercent(e);
      const dx = pct.x - dragging.startX;
      const dy = pct.y - dragging.startY;
      onFieldsChange(fields.map(f =>
        f.key === dragging.fieldKey
          ? { ...f, x: Math.max(0, dragging.origX + dx), y: Math.max(0, dragging.origY + dy) }
          : f
      ));
    }
  }, [drawing, drawStart, dragging, fields, onFieldsChange, toPercent]);

  const handleMouseUp = useCallback((e) => {
    if (drawing && drawRect && drawRect.w > 1 && drawRect.h > 0.5) {
      // Create new field
      const newField = {
        key:   `p${pageIndex + 1}_field_${Date.now()}`,
        label: "Nuevo campo",
        type:  "text",
        page:  pageIndex,
        x:     drawRect.x,
        y:     drawRect.y,
        w:     drawRect.w,
        h:     drawRect.h,
      };
      onFieldsChange([...fields, newField]);
      setEditingField(newField);
    }
    setDrawing(false);
    setDrawRect(null);
    setDrawStart(null);
    setDragging(null);
  }, [drawing, drawRect, fields, onFieldsChange, pageIndex]);

  return (
    <Box sx={{ position: "relative" }}>
      <Box
        ref={containerRef}
        sx={{ position: "relative", width: "100%", userSelect: "none",
          cursor: drawing ? "crosshair" : "default" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* PDF page image */}
        <img src={pageUrl} alt={`Página ${pageIndex + 1}`}
          style={{ width: "100%", display: "block", pointerEvents: "none" }}
          draggable={false}
        />

        {/* Draw-in-progress rectangle */}
        {drawing && drawRect && drawRect.w > 0 && (
          <Box sx={{
            position: "absolute",
            left:   `${drawRect.x}%`, top:    `${drawRect.y}%`,
            width:  `${drawRect.w}%`, height: `${drawRect.h}%`,
            border: `2px dashed ${C.rose}`,
            background: "rgba(192,0,90,0.08)",
            pointerEvents: "none",
          }} />
        )}

        {/* Existing fields */}
        {fields.map(f => (
          <Box
            key={f.key}
            sx={{
              position: "absolute",
              left: `${f.x}%`, top: `${f.y}%`,
              width: `${f.w}%`, height: `${f.h}%`,
              border: `2px solid ${C.rose}`,
              background: "rgba(192,0,90,0.10)",
              cursor: "grab",
              "&:hover": { background: "rgba(192,0,90,0.18)" },
              display: "flex", alignItems: "flex-start", overflow: "hidden",
            }}
            onMouseDown={e => {
              e.stopPropagation();
              const pct = toPercent(e);
              setDragging({ fieldKey: f.key, startX: pct.x, startY: pct.y, origX: f.x, origY: f.y });
            }}
            onMouseUp={e => { e.stopPropagation(); setDragging(null); }}
            onDoubleClick={e => { e.stopPropagation(); setEditingField(f); }}
          >
            <Box sx={{ bgcolor: C.rose, color: "#fff", fontSize: "9px", px: 0.5, lineHeight: 1.4,
              whiteSpace: "nowrap", overflow: "hidden", maxWidth: "100%", borderRadius: "0 0 2px 0" }}>
              {f.label || f.key}
            </Box>
          </Box>
        ))}
      </Box>

      {/* Field editor popover */}
      {editingField && (
        <>
          <Box sx={{ position: "fixed", inset: 0, zIndex: 1999, bgcolor: "rgba(0,0,0,0.3)" }}
            onClick={() => setEditingField(null)} />
          <FieldPopover
            field={editingField}
            onSave={updated => onFieldsChange(fields.map(f => f.key === editingField.key ? updated : f))}
            onDelete={() => onFieldsChange(fields.filter(f => f.key !== editingField.key))}
            onClose={() => setEditingField(null)}
          />
        </>
      )}
    </Box>
  );
}

// ─── Main Editor ─────────────────────────────────────────────────────────────
export default function FormTemplateEditor() {
  const { templateId } = useParams();
  const { token } = useOutletContext();
  const navigate = useNavigate();

  const [template, setTemplate] = useState(null);
  const [fields,   setFields]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [tab,      setTab]      = useState(0);
  const [snack,    setSnack]    = useState({ open: false, msg: "", severity: "success" });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${CLINIC_API}/clinic/form-templates/${templateId}`, { headers })
      .then(r => r.json())
      .then(t => {
        setTemplate(t);
        setFields(Array.isArray(t.field_map) ? t.field_map : []);
      })
      .finally(() => setLoading(false));
  }, [templateId]);

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch(`${CLINIC_API}/clinic/form-templates/${templateId}/fields`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ field_map: fields }),
      });
      if (!r.ok) throw new Error(await r.text());
      setSnack({ open: true, msg: "Campos guardados correctamente", severity: "success" });
    } catch (e) {
      setSnack({ open: true, msg: "Error al guardar: " + e.message, severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const updatePageFields = useCallback((pageIdx, newPageFields) => {
    setFields(prev => [
      ...prev.filter(f => f.page !== pageIdx),
      ...newPageFields,
    ]);
  }, []);

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}><CircularProgress sx={{ color: C.rose }} /></Box>;
  if (!template) return <Alert severity="error">Template no encontrado</Alert>;

  const pages = template.pages_urls || [];
  const fieldsForPage = (pageIdx) => fields.filter(f => f.page === pageIdx);

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto", p: 2 }}>
      {/* Toolbar */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/clinic/form-templates")} size="small" variant="outlined">
          Regresar
        </Button>
        <Typography variant="h6" fontWeight={800} color={C.rose} sx={{ flex: 1 }}>
          {template.name}
        </Typography>
        <Chip label={`${fields.length} campos configurados`}
          sx={{ bgcolor: C.pinkBg, color: C.rose, fontWeight: 700 }} />
        <Button
          startIcon={<SaveIcon />} variant="contained"
          onClick={save} disabled={saving}
          sx={{ bgcolor: C.rose, "&:hover": { bgcolor: "#a0004a" } }}
        >
          {saving ? "Guardando…" : "Guardar campos"}
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 2, fontSize: 12 }}>
        <strong>Cómo usar:</strong> Arrastra para dibujar un campo sobre una línea del PDF. Doble clic en un campo para nombrarlo. Arrastra campos existentes para moverlos.
      </Alert>

      {/* Page tabs */}
      {pages.length > 1 && (
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1, "& .Mui-selected": { color: C.rose } }}>
          {pages.map((_, i) => (
            <Tab key={i} label={`Pág. ${i + 1} (${fieldsForPage(i).length} campos)`} />
          ))}
        </Tabs>
      )}

      {/* Page editor */}
      {pages.length > 0 && (
        <Box sx={{ border: `2px solid ${C.pink}`, borderRadius: 2, overflow: "hidden" }}>
          <PageEditor
            pageUrl={pages[tab]}
            pageIndex={tab}
            fields={fieldsForPage(tab)}
            onFieldsChange={newF => updatePageFields(tab, newF)}
          />
        </Box>
      )}

      {/* Field list */}
      <Box sx={{ mt: 3 }}>
        <Typography fontWeight={700} color={C.rose} mb={1}>
          Campos configurados en esta página ({fieldsForPage(tab).length})
        </Typography>
        {fieldsForPage(tab).length === 0 ? (
          <Typography color="text.secondary" fontSize={13}>
            Dibuja campos sobre el PDF arrastrando con el mouse.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {fieldsForPage(tab).map(f => (
              <Chip key={f.key}
                label={`${f.label} (${f.type})`}
                onDelete={() => setFields(prev => prev.filter(x => x.key !== f.key))}
                sx={{ bgcolor: C.pinkBg, color: C.rose, "& .MuiChip-deleteIcon": { color: C.rose } }}
              />
            ))}
          </Box>
        )}
      </Box>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
