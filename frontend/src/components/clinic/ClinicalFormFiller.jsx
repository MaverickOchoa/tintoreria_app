import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Typography, Box, CircularProgress, MenuItem, Checkbox, FormControlLabel,
  Snackbar, Alert
} from "@mui/material";

const CLINIC_API = import.meta.env.VITE_CLINIC_API_URL || import.meta.env.VITE_API_URL || "";

export default function ClinicalFormFiller({ open, onClose, token, patientId, appointmentId, onSaved, entryId = null, templateId = null }) {
  const [template, setTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templatesList, setTemplatesList] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(templateId || "");
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });

  useEffect(() => {
    if (!open) return;
    if (entryId) {
      loadEntry(entryId);
    } else {
      if (templateId) {
        setSelectedTemplateId(templateId);
        loadTemplate(templateId);
      } else {
        loadTemplatesList();
      }
    }
  }, [open, entryId, templateId]);

  const loadTemplatesList = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${CLINIC_API}/clinic/form-templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (r.ok) {
        const data = await r.json();
        setTemplatesList(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadEntry = async (id) => {
    setLoading(true);
    try {
      const r = await fetch(`${CLINIC_API}/clinic/clinical-form-entries?patient_id=${patientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (r.ok) {
        const arr = await r.json();
        const entry = arr.find(e => e.id === id);
        if (entry) {
          setFormData(entry.form_data || {});
          setSelectedTemplateId(entry.template_id);
          await loadTemplate(entry.template_id, entry.form_data);
        }
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadTemplate = async (id, existingData = null) => {
    setLoading(true);
    try {
      const r = await fetch(`${CLINIC_API}/clinic/form-templates/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (r.ok) {
        const d = await r.json();
        setTemplate(d);
        if (!existingData) {
          const fd = {};
          let fm = d.field_map;
          if (typeof fm === "string") fm = JSON.parse(fm || "[]");
          fm.forEach(f => {
            if (f.type === "checkbox") fd[f.key] = false;
            else fd[f.key] = "";
          });
          setFormData(fd);
        }
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleFieldChange = (key, val) => {
    setFormData(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async (status = "final") => {
    if (!selectedTemplateId) return;
    setSaving(true);
    try {
      const payload = {
        patient_id: patientId,
        appointment_id: appointmentId,
        template_id: selectedTemplateId,
        form_data: formData,
        status: status,
      };
      
      const url = entryId 
        ? `${CLINIC_API}/clinic/clinical-form-entries/${entryId}`
        : `${CLINIC_API}/clinic/clinical-form-entries`;
      
      const r = await fetch(url, {
        method: entryId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (r.ok) {
        setSnack({ open: true, msg: "Hoja Clínica guardada", severity: "success" });
        if (onSaved) onSaved();
        setTimeout(onClose, 1000);
      } else {
        setSnack({ open: true, msg: "Error al guardar", severity: "error" });
      }
    } catch (e) {
      setSnack({ open: true, msg: "Error de red", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const renderField = (f) => {
    const val = formData[f.key] !== undefined ? formData[f.key] : "";
    if (f.type === "checkbox") {
      return (
        <FormControlLabel
          key={f.key}
          control={<Checkbox checked={!!val} onChange={(e) => handleFieldChange(f.key, e.target.checked)} />}
          label={f.label}
          sx={{ display: 'block', mb: 1 }}
        />
      );
    }
    if (f.type === "textarea" || f.type === "multiline") {
      return (
        <TextField
          key={f.key}
          label={f.label}
          multiline rows={4}
          fullWidth
          value={val}
          onChange={(e) => handleFieldChange(f.key, e.target.value)}
          sx={{ mb: 2 }}
        />
      );
    }
    return (
      <TextField
        key={f.key}
        label={f.label}
        fullWidth
        value={val}
        onChange={(e) => handleFieldChange(f.key, e.target.value)}
        sx={{ mb: 2 }}
      />
    );
  };

  const fieldsMap = template ? (typeof template.field_map === "string" ? JSON.parse(template.field_map || "[]") : template.field_map) : [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{entryId ? "Editar Hoja Clínica" : "Nueva Hoja Clínica"}</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}><CircularProgress /></Box>
        ) : (
          <Box>
            {!template && !entryId && (
              <TextField
                select
                label="Seleccionar Plantilla"
                fullWidth
                value={selectedTemplateId}
                onChange={(e) => {
                  setSelectedTemplateId(e.target.value);
                  loadTemplate(e.target.value);
                }}
                sx={{ mb: 3 }}
              >
                {templatesList.map(t => (
                  <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                ))}
              </TextField>
            )}

            {template && (
              <Box>
                <Typography variant="h6" mb={2} color="primary.main">{template.name}</Typography>
                {fieldsMap.map(renderField)}
                {fieldsMap.length === 0 && (
                  <Typography color="text.secondary">Esta plantilla no tiene campos de texto definidos en su esquema.</Typography>
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button onClick={() => handleSave("draft")} disabled={saving || !template}>Guardar Borrador</Button>
        <Button onClick={() => handleSave("final")} variant="contained" disabled={saving || !template} sx={{ bgcolor: "primary.main" }}>
          Completar
        </Button>
      </DialogActions>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity}>{snack.msg}</Alert>
      </Snackbar>
    </Dialog>
  );
}
