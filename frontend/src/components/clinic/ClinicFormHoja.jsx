import React, { useState, useEffect, useCallback } from "react";
import { useParams, useOutletContext, useNavigate, useSearchParams } from "react-router-dom";
import {
  Box, Button, CircularProgress, Snackbar, Alert,
  Tooltip, Chip, Typography,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import SaveIcon from "@mui/icons-material/Save";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { CLINIC_API } from "./clinicTheme";
import HojaClinicaTemplate, { INITIAL_FORM, PRINT_STYLE } from "./HojaClinicaTemplate";

export default function ClinicFormHoja() {
  const { patientId } = useParams();
  const [searchParams] = useSearchParams();
  const entryId      = searchParams.get("entry_id");
  const appointmentId = searchParams.get("appointment_id");
  const { token, claims } = useOutletContext();
  const navigate = useNavigate();

  const [patient, setPatient]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [status, setStatus]             = useState("draft");
  const [currentEntryId, setCurrentEntryId] = useState(entryId ? Number(entryId) : null);
  const [snack, setSnack]               = useState({ open: false, msg: "", severity: "success" });
  const [form, setForm]                 = useState({ ...INITIAL_FORM });

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // ── Inject print CSS once ────────────────────────────────────────────────────
  useEffect(() => {
    if (!document.getElementById("hoja-print-style")) {
      const tag = document.createElement("style");
      tag.id = "hoja-print-style";
      tag.innerHTML = PRINT_STYLE;
      document.head.appendChild(tag);
    }
  }, []);

  // ── Load patient + existing entry ────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const pRes = await fetch(`${CLINIC_API}/clinic/patients/${patientId}`, { headers });
        const p    = await pRes.json();
        setPatient(p);

        const w    = p.weight_kg  || "";
        const h    = p.height_cm  || "";
        const imc  = w && h ? String(Math.round(w / ((h / 100) ** 2) * 10) / 10) : "";
        const nombre = `${p.full_name || ""} ${p.last_name || ""}`.trim();

        setForm(prev => ({
          ...prev,
          nombre_paciente: nombre,
          talla:           h ? String(h) : "",
          peso:            w ? String(w) : "",
          imc,
          telefono:        p.phone            || "",
          fecha_nacimiento:p.birth_date        || "",
          estado_civil:    p.marital_status    || "",
          ocupacion:       p.occupation        || "",
          alergias:        p.allergies         || "",
          medicamentos:    p.current_medications || "",
          ahf:             p.medical_history   || "",
          app:             p.app_history        || "",
          motivo:          p.chief_complaint   || "",
          edad:            p.age ? String(p.age) : "",
        }));

        if (entryId) {
          const eRes = await fetch(`${CLINIC_API}/clinic/form-entries/${entryId}`, { headers });
          if (eRes.ok) {
            const e = await eRes.json();
            setForm(prev => ({ ...prev, ...e.form_data }));
            setStatus(e.status);
            setCurrentEntryId(e.id);
          }
        } else {
          const listUrl = `${CLINIC_API}/clinic/patients/${patientId}/form-entries?form_type=neurologica${appointmentId ? `&appointment_id=${appointmentId}` : ""}`;
          const listRes = await fetch(listUrl, { headers });
          if (listRes.ok) {
            const list = await listRes.json();
            const drafts = (list.entries || []).filter(e => e.status === "draft");
            if (drafts.length > 0) {
              const latest = drafts[0];
              setForm(prev => ({ ...prev, ...latest.form_data }));
              setStatus(latest.status);
              setCurrentEntryId(latest.id);
            }
          }
        }
      } catch (err) {
        console.error("ClinicFormHoja fetchData:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, entryId]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleRadio = useCallback((name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
  }, []);

  const saveEntry = async (finalStatus = "draft") => {
    setSaving(true);
    try {
      const body = {
        patient_id:     Number(patientId),
        appointment_id: appointmentId ? Number(appointmentId) : null,
        business_id:    claims?.business_id,
        branch_id:      claims?.active_branch_id || claims?.branch_id,
        form_type:      "neurologica",
        form_data:      form,
        status:         finalStatus,
      };
      let res;
      if (currentEntryId) {
        res = await fetch(`${CLINIC_API}/clinic/form-entries/${currentEntryId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ form_data: form, status: finalStatus }),
        });
      } else {
        res = await fetch(`${CLINIC_API}/clinic/form-entries`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
      }
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      setCurrentEntryId(saved.id);
      setStatus(finalStatus);
      setSnack({
        open: true,
        msg:  finalStatus === "final" ? "Guardado en expediente del paciente" : "Borrador guardado",
        severity: "success",
      });
    } catch (err) {
      setSnack({ open: true, msg: "Error al guardar: " + err.message, severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}><CircularProgress /></Box>;

  const isReadOnly   = status === "final";
  const patientName  = patient ? `${patient.full_name || ""} ${patient.last_name || ""}`.trim() : "";

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 1, md: 2 } }}>

      {/* ── Toolbar ── */}
      <Box className="no-print" sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} variant="outlined" size="small">
          Regresar
        </Button>
        <Typography variant="h6" sx={{ fontWeight: 700, flex: 1, ml: 1, fontSize: { xs: 13, md: 16 } }}>
          Hoja Clínica — {patientName}
        </Typography>

        {status === "final" && (
          <Chip icon={<CheckCircleIcon />} label="Guardado en expediente" color="success" size="small" />
        )}

        <Tooltip title="Guardar borrador (puedes seguir editando)">
          <span>
            <Button
              startIcon={<SaveIcon />}
              onClick={() => saveEntry("draft")}
              disabled={saving || isReadOnly}
              variant="outlined"
              size="small"
            >
              {saving ? "Guardando…" : "Borrador"}
            </Button>
          </span>
        </Tooltip>

        <Tooltip title="Finalizar y guardar en expediente (no editable después)">
          <span>
            <Button
              startIcon={<CheckCircleIcon />}
              onClick={() => saveEntry("final")}
              disabled={saving || isReadOnly}
              variant="contained"
              color="success"
              size="small"
            >
              Guardar en expediente
            </Button>
          </span>
        </Tooltip>

        <Button startIcon={<PrintIcon />} onClick={() => window.print()} variant="contained" size="small">
          Imprimir
        </Button>
      </Box>

      {isReadOnly && (
        <Alert severity="info" sx={{ mb: 2 }} className="no-print">
          Este formulario está guardado en el expediente y no puede modificarse.
        </Alert>
      )}

      {/* ── Hoja clínica (template CSS) ── */}
      <HojaClinicaTemplate
        form={form}
        onChange={handleChange}
        onRadio={handleRadio}
        readOnly={isReadOnly}
      />

      {/* ── Mobile floating bar ── */}
      <Box className="no-print" sx={{ display: { xs: "flex", md: "none" }, gap: 1, mt: 2, justifyContent: "center" }}>
        <Button variant="outlined" onClick={() => saveEntry("draft")} disabled={saving || isReadOnly} size="small">
          Borrador
        </Button>
        <Button variant="contained" color="success" onClick={() => saveEntry("final")} disabled={saving || isReadOnly} size="small">
          Guardar
        </Button>
        <Button variant="contained" onClick={() => window.print()} size="small">
          Imprimir
        </Button>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))} sx={{ width: "100%" }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
