import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useOutletContext, useNavigate, useSearchParams } from "react-router-dom";
import {
  Box, Typography, Button, CircularProgress, Snackbar, Alert,
  Divider, Paper, Tooltip, Chip,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import SaveIcon from "@mui/icons-material/Save";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { CLINIC_API } from "./clinicTheme";

// ─── Print CSS injected once ─────────────────────────────────────────────────
const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #hoja-clinica-print, #hoja-clinica-print * { visibility: visible !important; }
  #hoja-clinica-print { position: absolute; left: 0; top: 0; width: 100%; }
  .no-print { display: none !important; }
  .page-break { page-break-before: always; }
  .hoja-section { break-inside: avoid; }
  input, textarea { border: none !important; border-bottom: 1px solid #555 !important; background: transparent !important; }
}
`;

// ─── Reusable field components ────────────────────────────────────────────────
function FieldLine({ label, name, value, onChange, width = "100%", multiline = false, rows = 1, readOnly = false }) {
  const style = {
    display: "inline-flex",
    flexDirection: "column",
    width,
    verticalAlign: "top",
    marginBottom: 6,
    paddingRight: 8,
  };
  const inputStyle = {
    border: "none",
    borderBottom: "1.5px solid #333",
    outline: "none",
    width: "100%",
    fontSize: 13,
    padding: "2px 0",
    background: "transparent",
    resize: "vertical",
    fontFamily: "inherit",
    color: readOnly ? "#555" : "#000",
  };
  return (
    <span style={style}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: 0.3 }}>
        {label}
      </span>
      {multiline ? (
        <textarea
          rows={rows}
          name={name}
          value={value || ""}
          onChange={onChange}
          readOnly={readOnly}
          style={inputStyle}
        />
      ) : (
        <input
          type="text"
          name={name}
          value={value || ""}
          onChange={onChange}
          readOnly={readOnly}
          style={inputStyle}
        />
      )}
    </span>
  );
}

function SectionTitle({ children }) {
  return (
    <Typography
      variant="subtitle2"
      sx={{
        fontWeight: 700,
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 1,
        color: "#4361ee",
        borderBottom: "2px solid #4361ee",
        pb: 0.3,
        mb: 1,
        mt: 1.5,
      }}
    >
      {children}
    </Typography>
  );
}

// ─── Escala de Barthel items ──────────────────────────────────────────────────
const BARTHEL_ITEMS = [
  { key: "comida", label: "Comida", opts: [{ v: 0, l: "Incapaz" }, { v: 5, l: "Necesita ayuda" }, { v: 10, l: "Independiente" }] },
  { key: "traslado", label: "Traslado (cama-sillón)", opts: [{ v: 0, l: "Incapaz" }, { v: 5, l: "Gran ayuda" }, { v: 10, l: "Poca ayuda" }, { v: 15, l: "Independiente" }] },
  { key: "aseo", label: "Aseo personal", opts: [{ v: 0, l: "Necesita ayuda" }, { v: 5, l: "Independiente" }] },
  { key: "retrete", label: "Uso del retrete", opts: [{ v: 0, l: "Dependiente" }, { v: 5, l: "Necesita ayuda" }, { v: 10, l: "Independiente" }] },
  { key: "banio", label: "Baño", opts: [{ v: 0, l: "Dependiente" }, { v: 5, l: "Independiente" }] },
  { key: "desplazamiento", label: "Desplazamiento", opts: [{ v: 0, l: "Inmóvil" }, { v: 5, l: "Independiente en silla" }, { v: 10, l: "Camina con ayuda" }, { v: 15, l: "Independiente" }] },
  { key: "escaleras", label: "Subir/bajar escaleras", opts: [{ v: 0, l: "Incapaz" }, { v: 5, l: "Necesita ayuda" }, { v: 10, l: "Independiente" }] },
  { key: "vestido", label: "Vestido", opts: [{ v: 0, l: "Dependiente" }, { v: 5, l: "Necesita ayuda" }, { v: 10, l: "Independiente" }] },
  { key: "deposicion", label: "Control de deposición", opts: [{ v: 0, l: "Incontinente" }, { v: 5, l: "Accidente ocasional" }, { v: 10, l: "Continente" }] },
  { key: "orina", label: "Control de orina", opts: [{ v: 0, l: "Incontinente" }, { v: 5, l: "Accidente ocasional" }, { v: 10, l: "Continente" }] },
];

// ─── Tinetti equilibrio ───────────────────────────────────────────────────────
const TINETTI_EQUILIBRIO = [
  { key: "eq1", label: "1. Equilibrio sentado", opts: [{ v: 0, l: "Se inclina o desliza" }, { v: 1, l: "Firme, seguro" }] },
  { key: "eq2", label: "2. Incorporación", opts: [{ v: 0, l: "Incapaz sin ayuda" }, { v: 1, l: "Usa brazos como ayuda" }, { v: 2, l: "Sin usar brazos" }] },
  { key: "eq3", label: "3. Intento de incorporación", opts: [{ v: 0, l: "Incapaz sin ayuda" }, { v: 1, l: "Capaz >1 intento" }, { v: 2, l: "Capaz al primer intento" }] },
  { key: "eq4", label: "4. Equilibrio inmediato al levantarse", opts: [{ v: 0, l: "Inseguro" }, { v: 1, l: "Firme con bastón/apoyo" }, { v: 2, l: "Firme sin apoyo" }] },
  { key: "eq5", label: "5. Equilibrio en bipedestación", opts: [{ v: 0, l: "Inseguro" }, { v: 1, l: "Firma <8cm o bastón" }, { v: 2, l: "Leve separación sin apoyo" }] },
  { key: "eq6", label: "6. Recibe ligero empujón", opts: [{ v: 0, l: "Empieza a caer" }, { v: 1, l: "Tambalea, se afirma" }, { v: 2, l: "Se mantiene firme" }] },
  { key: "eq7", label: "7. Ojos cerrados (pies juntos)", opts: [{ v: 0, l: "Inseguro" }, { v: 1, l: "Firme" }] },
  { key: "eq8a", label: "8A. Giro 360° (pasos)", opts: [{ v: 0, l: "Discontinuos" }, { v: 1, l: "Continuos" }] },
  { key: "eq8b", label: "8B. Giro 360° (seguridad)", opts: [{ v: 0, l: "Inseguro" }, { v: 1, l: "Seguro" }] },
  { key: "eq9", label: "9. Sentarse", opts: [{ v: 0, l: "Inseguro / cae en silla" }, { v: 1, l: "Usa brazos / brusco" }, { v: 2, l: "Seguro, suave" }] },
];

const TINETTI_MARCHA = [
  { key: "m1", label: "1. Inicio de la marcha", opts: [{ v: 0, l: "Vacilación o múltiples intentos" }, { v: 1, l: "Sin vacilación" }] },
  { key: "m2", label: "2. Longitud y altura del paso D", opts: [{ v: 0, l: "No sobrepasa pie izquierdo o no se eleva" }, { v: 1, l: "Sobrepasa pie izquierdo y se eleva" }] },
  { key: "m3", label: "3. Longitud y altura del paso I", opts: [{ v: 0, l: "No sobrepasa pie derecho o no se eleva" }, { v: 1, l: "Sobrepasa pie derecho y se eleva" }] },
  { key: "m4", label: "4. Simetría del paso", opts: [{ v: 0, l: "Longitud desigual D-I" }, { v: 1, l: "Longitud igual D-I" }] },
  { key: "m5", label: "5. Fluidez del paso", opts: [{ v: 0, l: "Paradas o discontinuidades" }, { v: 1, l: "Sin paradas, fluida" }] },
  { key: "m6", label: "6. Trayectoria", opts: [{ v: 0, l: "Marcada desviación" }, { v: 1, l: "Leve/moderada desviación o usa apoyo" }, { v: 2, l: "Sin desviación y sin apoyo" }] },
  { key: "m7", label: "7. Tronco", opts: [{ v: 0, l: "Marcado balanceo o usa apoyo" }, { v: 1, l: "Sin balanceo pero flexiona rodillas o dolor" }, { v: 2, l: "Sin balanceo, sin flexión, sin apoyo" }] },
  { key: "m8", label: "8. Postura en la marcha", opts: [{ v: 0, l: "Talones separados" }, { v: 1, l: "Talones casi juntos al caminar" }] },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function ClinicFormHoja() {
  const { patientId } = useParams();
  const [searchParams] = useSearchParams();
  const entryId = searchParams.get("entry_id");
  const appointmentId = searchParams.get("appointment_id");
  const { token } = useOutletContext();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState("draft");
  const [currentEntryId, setCurrentEntryId] = useState(entryId ? Number(entryId) : null);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });

  // All form fields merged into a single state object
  const [form, setForm] = useState({
    // P1 — Datos
    fecha: new Date().toLocaleDateString("es-MX"),
    sesion_num: "",
    edad: "", fecha_nacimiento: "", estado_civil: "", ocupacion: "",
    telefono: "", domicilio: "",
    talla: "", peso: "", imc: "", sat02: "",
    // Signos vitales
    fc: "", ta: "", tc: "",
    // Historia clínica
    ahf: "", app: "", apnp: "", ago: "", alergias: "", medicamentos: "",
    // Motivo / plan
    motivo: "", objetivos: "",
    // P2 — Interconsulta
    notas_interconsulta: "",
    // P3-4 — Seguimiento SOAP
    soap_s: "", soap_o: "", soap_a: "", soap_p: "",
    // P5 — ISNCSCI (simplified — key muscle grades and totals)
    isncsci_comments: "",
    uer: "", uel: "", ler: "", lel: "",
    lte: "", ltl: "", pper: "", ppel: "",
    nli: "", complete_incomplete: "", ais: "",
    // P6 — Barthel
    ...Object.fromEntries(BARTHEL_ITEMS.map(i => [`barthel_${i.key}`, ""])),
    // P7 — Ashworth
    ashworth_score: "", campbell_score: "", tono_notes: "",
    // P8 — Tinetti
    ...Object.fromEntries(TINETTI_EQUILIBRIO.map(i => [`tinetti_${i.key}`, ""])),
    ...Object.fromEntries(TINETTI_MARCHA.map(i => [`tinetti_${i.key}`, ""])),
    tinetti_notes: "",
    // General
    firma_paciente: "",
  });

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // Load patient + existing entry
  useEffect(() => {
    const injectStyle = () => {
      if (!document.getElementById("hoja-print-style")) {
        const tag = document.createElement("style");
        tag.id = "hoja-print-style";
        tag.innerHTML = PRINT_STYLE;
        document.head.appendChild(tag);
      }
    };
    injectStyle();

    const fetchData = async () => {
      try {
        const [pRes] = await Promise.all([
          fetch(`${CLINIC_API}/clinic/patients/${patientId}`, { headers }),
        ]);
        const p = await pRes.json();
        setPatient(p);

        // Pre-fill patient fields
        const w = p.weight_kg || "";
        const h = p.height_cm || "";
        const imc = w && h ? String(Math.round(w / ((h / 100) ** 2) * 10) / 10) : "";
        setForm(prev => ({
          ...prev,
          talla: h ? String(h) : "",
          peso: w ? String(w) : "",
          imc,
          telefono: p.phone || "",
          fecha_nacimiento: p.birth_date || "",
          estado_civil: p.marital_status || "",
          ocupacion: p.occupation || "",
          alergias: p.allergies || "",
          medicamentos: p.current_medications || "",
          ahf: p.medical_history || "",
          app: p.app_history || "",
          motivo: p.chief_complaint || "",
        }));

        // Load existing entry if provided
        const eid = entryId;
        if (eid) {
          const eRes = await fetch(`${CLINIC_API}/clinic/form-entries/${eid}`, { headers });
          if (eRes.ok) {
            const e = await eRes.json();
            setForm(prev => ({ ...prev, ...e.form_data }));
            setStatus(e.status);
            setCurrentEntryId(e.id);
          }
        } else {
          // Check if there's an existing draft for this patient/appointment
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
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [patientId, entryId]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setSaved(false);
  }, []);

  const handleRadio = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const barthelTotal = BARTHEL_ITEMS.reduce((sum, i) => sum + (Number(form[`barthel_${i.key}`]) || 0), 0);
  const barthelClass =
    barthelTotal < 20 ? "Dependencia Total" :
    barthelTotal <= 35 ? "Dependencia Severa" :
    barthelTotal <= 55 ? "Dependencia Moderada" :
    barthelTotal <= 95 ? "Dependencia Leve" : "Independencia";

  const tinEqTotal = TINETTI_EQUILIBRIO.reduce((s, i) => s + (Number(form[`tinetti_${i.key}`]) || 0), 0);
  const tinMaTotal = TINETTI_MARCHA.reduce((s, i) => s + (Number(form[`tinetti_${i.key}`]) || 0), 0);

  const saveEntry = async (finalStatus = "draft") => {
    setSaving(true);
    try {
      const body = {
        patient_id: Number(patientId),
        appointment_id: appointmentId ? Number(appointmentId) : null,
        form_type: "neurologica",
        form_data: form,
        status: finalStatus,
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
      const saved_entry = await res.json();
      setCurrentEntryId(saved_entry.id);
      setStatus(finalStatus);
      setSaved(true);
      setSnack({ open: true, msg: finalStatus === "final" ? "Guardado en expediente del paciente" : "Borrador guardado", severity: "success" });
    } catch (err) {
      setSnack({ open: true, msg: "Error al guardar: " + err.message, severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => window.print();

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}><CircularProgress /></Box>;

  const patientName = patient ? `${patient.full_name || ""} ${patient.last_name || ""}`.trim() : "";
  const isReadOnly = status === "final";

  return (
    <Box sx={{ maxWidth: 920, mx: "auto", p: { xs: 2, md: 3 } }}>
      {/* Top bar — no-print */}
      <Box className="no-print" sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} variant="outlined" size="small">
          Regresar
        </Button>
        <Typography variant="h6" sx={{ fontWeight: 700, flex: 1, ml: 1 }}>
          Hoja Clínica Neurológica
          {patientName && <span style={{ fontWeight: 400, fontSize: 14, marginLeft: 8, color: "#666" }}>— {patientName}</span>}
        </Typography>
        {status === "final" && (
          <Chip icon={<CheckCircleIcon />} label="Guardado en expediente" color="success" size="small" />
        )}
        <Tooltip title="Guardar borrador">
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
        <Tooltip title="Guardar en expediente del paciente (no editable después)">
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
        <Button startIcon={<PrintIcon />} onClick={handlePrint} variant="contained" size="small">
          Imprimir
        </Button>
      </Box>

      {isReadOnly && (
        <Alert severity="info" sx={{ mb: 2 }} className="no-print">
          Este formulario está guardado en el expediente y no puede modificarse.
        </Alert>
      )}

      {/* ═══════════ PRINTABLE AREA ═══════════ */}
      <div id="hoja-clinica-print">
        <Paper elevation={0} sx={{ p: { xs: 2, md: 4 }, border: "1px solid #ddd", borderRadius: 2 }}>

          {/* Header */}
          <Box sx={{ textAlign: "center", mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#4361ee", letterSpacing: 1 }}>
              Hoja Clínica Neurológica
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {patientName}
            </Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />

          {/* ── P1: Datos del Paciente ─────────────────────────────────── */}
          <SectionTitle>Datos del Paciente</SectionTitle>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0 }}>
            <FieldLine label="Nombre del Paciente" name="nombre_paciente" value={patientName} onChange={handleChange} width="60%" readOnly />
            <FieldLine label="Fecha" name="fecha" value={form.fecha} onChange={handleChange} width="20%" readOnly={isReadOnly} />
            <FieldLine label="Sesión N°" name="sesion_num" value={form.sesion_num} onChange={handleChange} width="20%" readOnly={isReadOnly} />
            <FieldLine label="Edad" name="edad" value={form.edad || String(patient?.age || "")} onChange={handleChange} width="15%" readOnly={isReadOnly} />
            <FieldLine label="Fecha de Nacimiento" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleChange} width="25%" readOnly={isReadOnly} />
            <FieldLine label="Edo. Civil" name="estado_civil" value={form.estado_civil} onChange={handleChange} width="20%" readOnly={isReadOnly} />
            <FieldLine label="Ocupación" name="ocupacion" value={form.ocupacion} onChange={handleChange} width="40%" readOnly={isReadOnly} />
            <FieldLine label="Teléfono" name="telefono" value={form.telefono} onChange={handleChange} width="25%" readOnly={isReadOnly} />
            <FieldLine label="Domicilio" name="domicilio" value={form.domicilio} onChange={handleChange} width="75%" readOnly={isReadOnly} />
            <FieldLine label="Talla (cm)" name="talla" value={form.talla} onChange={handleChange} width="15%" readOnly={isReadOnly} />
            <FieldLine label="Peso (kg)" name="peso" value={form.peso} onChange={handleChange} width="15%" readOnly={isReadOnly} />
            <FieldLine label="IMC" name="imc" value={form.imc} onChange={handleChange} width="15%" readOnly={isReadOnly} />
            <FieldLine label="SatO₂" name="sat02" value={form.sat02} onChange={handleChange} width="15%" readOnly={isReadOnly} />
          </Box>

          {/* ── Signos Vitales ─────────────────────────────────────────── */}
          <SectionTitle>Signos Vitales</SectionTitle>
          <Box sx={{ display: "flex", flexWrap: "wrap" }}>
            <FieldLine label="F/C (frec. cardíaca)" name="fc" value={form.fc} onChange={handleChange} width="33%" readOnly={isReadOnly} />
            <FieldLine label="T/A (tensión arterial)" name="ta" value={form.ta} onChange={handleChange} width="33%" readOnly={isReadOnly} />
            <FieldLine label="TC (temp. corporal)" name="tc" value={form.tc} onChange={handleChange} width="33%" readOnly={isReadOnly} />
          </Box>

          {/* ── Historia Clínica ───────────────────────────────────────── */}
          <SectionTitle>Historia Clínica</SectionTitle>
          <Box sx={{ display: "flex", flexWrap: "wrap" }}>
            <FieldLine label="AHF (Antecedentes Heredofamiliares)" name="ahf" value={form.ahf} onChange={handleChange} width="100%" multiline rows={2} readOnly={isReadOnly} />
            <FieldLine label="APP (Antecedentes Patológicos Personales — incluir Qx)" name="app" value={form.app} onChange={handleChange} width="100%" multiline rows={2} readOnly={isReadOnly} />
            <FieldLine label="APNP (Antecedentes Personales No Patológicos — incluir AVDH)" name="apnp" value={form.apnp} onChange={handleChange} width="100%" multiline rows={2} readOnly={isReadOnly} />
            <FieldLine label="AGO" name="ago" value={form.ago} onChange={handleChange} width="100%" multiline rows={1} readOnly={isReadOnly} />
            <FieldLine label="Alergias" name="alergias" value={form.alergias} onChange={handleChange} width="50%" multiline rows={1} readOnly={isReadOnly} />
            <FieldLine label="Toma de Medicamentos (actual)" name="medicamentos" value={form.medicamentos} onChange={handleChange} width="50%" multiline rows={1} readOnly={isReadOnly} />
          </Box>

          {/* ── Motivo de Consulta ─────────────────────────────────────── */}
          <SectionTitle>Motivo de Consulta</SectionTitle>
          <FieldLine label="" name="motivo" value={form.motivo} onChange={handleChange} width="100%" multiline rows={4} readOnly={isReadOnly} />

          {/* ── Objetivos y Plan ───────────────────────────────────────── */}
          <SectionTitle>Objetivos, Plan de Tratamiento e Intervención</SectionTitle>
          <FieldLine label="" name="objetivos" value={form.objetivos} onChange={handleChange} width="100%" multiline rows={4} readOnly={isReadOnly} />

          {/* ── P2: Notas Interconsulta ─────────────────────────────────── */}
          <div className="page-break" />
          <SectionTitle>Notas Interconsulta</SectionTitle>
          <FieldLine label="" name="notas_interconsulta" value={form.notas_interconsulta} onChange={handleChange} width="100%" multiline rows={8} readOnly={isReadOnly} />

          {/* ── P3-4: Seguimiento / Notas SOAP ─────────────────────────── */}
          <div className="page-break" />
          <SectionTitle>Seguimiento — Notas SOAP</SectionTitle>
          <Box sx={{ display: "flex", flexWrap: "wrap" }}>
            <FieldLine label="S — Subjetivo (síntomas, queja principal)" name="soap_s" value={form.soap_s} onChange={handleChange} width="100%" multiline rows={3} readOnly={isReadOnly} />
            <FieldLine label="O — Objetivo (hallazgos, mediciones)" name="soap_o" value={form.soap_o} onChange={handleChange} width="100%" multiline rows={3} readOnly={isReadOnly} />
            <FieldLine label="A — Análisis (evaluación, diagnóstico)" name="soap_a" value={form.soap_a} onChange={handleChange} width="100%" multiline rows={3} readOnly={isReadOnly} />
            <FieldLine label="P — Plan (tratamiento, próxima sesión)" name="soap_p" value={form.soap_p} onChange={handleChange} width="100%" multiline rows={3} readOnly={isReadOnly} />
          </Box>

          {/* ── P5: ISNCSCI ─────────────────────────────────────────────── */}
          <div className="page-break" />
          <SectionTitle>ISNCSCI — Clasificación Neurológica de Lesión Medular</SectionTitle>
          <Box sx={{ display: "flex", flexWrap: "wrap" }}>
            <FieldLine label="UE Derecho (máx 25)" name="uer" value={form.uer} onChange={handleChange} width="25%" readOnly={isReadOnly} />
            <FieldLine label="UE Izquierdo (máx 25)" name="uel" value={form.uel} onChange={handleChange} width="25%" readOnly={isReadOnly} />
            <FieldLine label="LE Derecho (máx 25)" name="ler" value={form.ler} onChange={handleChange} width="25%" readOnly={isReadOnly} />
            <FieldLine label="LE Izquierdo (máx 25)" name="lel" value={form.lel} onChange={handleChange} width="25%" readOnly={isReadOnly} />
            <FieldLine label="LT Derecho (máx 56)" name="lte" value={form.lte} onChange={handleChange} width="25%" readOnly={isReadOnly} />
            <FieldLine label="LT Izquierdo (máx 56)" name="ltl" value={form.ltl} onChange={handleChange} width="25%" readOnly={isReadOnly} />
            <FieldLine label="PP Derecho (máx 56)" name="pper" value={form.pper} onChange={handleChange} width="25%" readOnly={isReadOnly} />
            <FieldLine label="PP Izquierdo (máx 56)" name="ppel" value={form.ppel} onChange={handleChange} width="25%" readOnly={isReadOnly} />
            <FieldLine label="NLI (Nivel Neurológico de Lesión)" name="nli" value={form.nli} onChange={handleChange} width="33%" readOnly={isReadOnly} />
            <FieldLine label="Completa / Incompleta" name="complete_incomplete" value={form.complete_incomplete} onChange={handleChange} width="33%" readOnly={isReadOnly} />
            <FieldLine label="AIS (Escala ASIA)" name="ais" value={form.ais} onChange={handleChange} width="33%" readOnly={isReadOnly} />
            <FieldLine label="Comentarios ISNCSCI" name="isncsci_comments" value={form.isncsci_comments} onChange={handleChange} width="100%" multiline rows={3} readOnly={isReadOnly} />
          </Box>

          {/* ── P6: Escala de Barthel ─────────────────────────────────── */}
          <div className="page-break" />
          <SectionTitle>Escala de Barthel — Índice de Independencia Funcional</SectionTitle>
          <Box sx={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f0f4ff" }}>
                  <th style={{ textAlign: "left", padding: "4px 8px", border: "1px solid #ccc" }}>Actividad</th>
                  <th style={{ textAlign: "center", padding: "4px 8px", border: "1px solid #ccc", minWidth: 300 }}>Opciones</th>
                  <th style={{ textAlign: "center", padding: "4px 8px", border: "1px solid #ccc", width: 60 }}>Puntaje</th>
                </tr>
              </thead>
              <tbody>
                {BARTHEL_ITEMS.map(item => (
                  <tr key={item.key}>
                    <td style={{ padding: "4px 8px", border: "1px solid #ccc", fontWeight: 600 }}>{item.label}</td>
                    <td style={{ padding: "4px 8px", border: "1px solid #ccc" }}>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {item.opts.map(opt => (
                          <label key={opt.v} style={{ display: "flex", alignItems: "center", gap: 4, cursor: isReadOnly ? "default" : "pointer", marginRight: 8 }}>
                            <input
                              type="radio"
                              name={`barthel_${item.key}`}
                              value={String(opt.v)}
                              checked={String(form[`barthel_${item.key}`]) === String(opt.v)}
                              onChange={isReadOnly ? undefined : () => handleRadio(`barthel_${item.key}`, String(opt.v))}
                              disabled={isReadOnly}
                            />
                            <span>{opt.v} — {opt.l}</span>
                          </label>
                        ))}
                      </Box>
                    </td>
                    <td style={{ padding: "4px 8px", border: "1px solid #ccc", textAlign: "center", fontWeight: 700 }}>
                      {form[`barthel_${item.key}`] !== "" ? form[`barthel_${item.key}`] : "—"}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: "#f0f4ff" }}>
                  <td colSpan={2} style={{ padding: "6px 8px", border: "1px solid #ccc", fontWeight: 700, textAlign: "right" }}>
                    Total: {barthelTotal}/100 — {barthelClass}
                  </td>
                  <td style={{ padding: "6px 8px", border: "1px solid #ccc", textAlign: "center", fontWeight: 800, color: "#4361ee" }}>
                    {barthelTotal}
                  </td>
                </tr>
              </tbody>
            </table>
          </Box>

          {/* ── P7: Ashworth + Campbell ───────────────────────────────── */}
          <div className="page-break" />
          <SectionTitle>Tono Muscular — Ashworth &amp; Campbell</SectionTitle>
          <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>Escala de Ashworth</Typography>
              {["0 — Normal", "1 — Ligero aumento (bloqueo al final)", "1+ — Ligero aumento (>mitad arco)", "2 — Más pronunciado, mueve con facilidad", "3 — Considerable, movimiento pasivo difícil", "4 — Rígido"].map((opt, idx) => (
                <label key={idx} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, cursor: isReadOnly ? "default" : "pointer" }}>
                  <input
                    type="radio"
                    name="ashworth_score"
                    value={opt.split(" — ")[0]}
                    checked={form.ashworth_score === opt.split(" — ")[0]}
                    onChange={isReadOnly ? undefined : () => handleRadio("ashworth_score", opt.split(" — ")[0])}
                    disabled={isReadOnly}
                  />
                  <span style={{ fontSize: 12 }}>{opt}</span>
                </label>
              ))}
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>Escala de Campbell</Typography>
              {["-3 Hipotonía Severa (sin resist.)", "-2 Hipotonía Severa (axial/proximal)", "-1 Hipotonía Leve", "0 Normal", "+1 Hipertonía Leve", "+2 Hipertonía Moderada", "+3 Hipertonía Severa"].map((opt, idx) => (
                <label key={idx} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, cursor: isReadOnly ? "default" : "pointer" }}>
                  <input
                    type="radio"
                    name="campbell_score"
                    value={opt.split(" ")[0]}
                    checked={form.campbell_score === opt.split(" ")[0]}
                    onChange={isReadOnly ? undefined : () => handleRadio("campbell_score", opt.split(" ")[0])}
                    disabled={isReadOnly}
                  />
                  <span style={{ fontSize: 12 }}>{opt}</span>
                </label>
              ))}
            </Box>
          </Box>
          <FieldLine label="Notas de tono muscular" name="tono_notes" value={form.tono_notes} onChange={handleChange} width="100%" multiline rows={2} readOnly={isReadOnly} />

          {/* ── P8: Tinetti ───────────────────────────────────────────── */}
          <div className="page-break" />
          <SectionTitle>Escala de Tinetti — Equilibrio y Marcha</SectionTitle>
          <Typography variant="caption" display="block" mb={1} color="text.secondary">
            INSTRUCCIONES: Se sienta al sujeto en una silla dura sin brazos.
          </Typography>
          <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>EQUILIBRIO (máx 16)</Typography>
          <Box sx={{ overflowX: "auto", mb: 1 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <tbody>
                {TINETTI_EQUILIBRIO.map(item => (
                  <tr key={item.key}>
                    <td style={{ padding: "3px 6px", border: "1px solid #ddd", width: "30%", fontWeight: 600 }}>{item.label}</td>
                    <td style={{ padding: "3px 6px", border: "1px solid #ddd" }}>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {item.opts.map(opt => (
                          <label key={opt.v} style={{ display: "flex", alignItems: "center", gap: 4, marginRight: 8, cursor: isReadOnly ? "default" : "pointer" }}>
                            <input
                              type="radio"
                              name={`tinetti_${item.key}`}
                              value={String(opt.v)}
                              checked={String(form[`tinetti_${item.key}`]) === String(opt.v)}
                              onChange={isReadOnly ? undefined : () => handleRadio(`tinetti_${item.key}`, String(opt.v))}
                              disabled={isReadOnly}
                            />
                            <span>{opt.v} — {opt.l}</span>
                          </label>
                        ))}
                      </Box>
                    </td>
                    <td style={{ padding: "3px 6px", border: "1px solid #ddd", textAlign: "center", width: 40, fontWeight: 700 }}>
                      {form[`tinetti_${item.key}`] !== "" ? form[`tinetti_${item.key}`] : "—"}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: "#f0f4ff" }}>
                  <td colSpan={2} style={{ padding: "4px 6px", border: "1px solid #ddd", fontWeight: 700, textAlign: "right" }}>
                    Puntaje Equilibrio ({"<"}10 = Alto riesgo de caída):
                  </td>
                  <td style={{ padding: "4px 6px", border: "1px solid #ddd", textAlign: "center", fontWeight: 800, color: tinEqTotal < 10 ? "#d32f2f" : "#2e7d32" }}>
                    {tinEqTotal}/16
                  </td>
                </tr>
              </tbody>
            </table>
          </Box>

          <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>MARCHA (máx 12)</Typography>
          <Box sx={{ overflowX: "auto", mb: 1 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <tbody>
                {TINETTI_MARCHA.map(item => (
                  <tr key={item.key}>
                    <td style={{ padding: "3px 6px", border: "1px solid #ddd", width: "30%", fontWeight: 600 }}>{item.label}</td>
                    <td style={{ padding: "3px 6px", border: "1px solid #ddd" }}>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {item.opts.map(opt => (
                          <label key={opt.v} style={{ display: "flex", alignItems: "center", gap: 4, marginRight: 8, cursor: isReadOnly ? "default" : "pointer" }}>
                            <input
                              type="radio"
                              name={`tinetti_${item.key}`}
                              value={String(opt.v)}
                              checked={String(form[`tinetti_${item.key}`]) === String(opt.v)}
                              onChange={isReadOnly ? undefined : () => handleRadio(`tinetti_${item.key}`, String(opt.v))}
                              disabled={isReadOnly}
                            />
                            <span>{opt.v} — {opt.l}</span>
                          </label>
                        ))}
                      </Box>
                    </td>
                    <td style={{ padding: "3px 6px", border: "1px solid #ddd", textAlign: "center", width: 40, fontWeight: 700 }}>
                      {form[`tinetti_${item.key}`] !== "" ? form[`tinetti_${item.key}`] : "—"}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: "#f0f4ff" }}>
                  <td colSpan={2} style={{ padding: "4px 6px", border: "1px solid #ddd", fontWeight: 700, textAlign: "right" }}>
                    Puntaje Marcha:
                  </td>
                  <td style={{ padding: "4px 6px", border: "1px solid #ddd", textAlign: "center", fontWeight: 800, color: "#4361ee" }}>
                    {tinMaTotal}/12
                  </td>
                </tr>
                <tr style={{ background: "#e8f5e9" }}>
                  <td colSpan={2} style={{ padding: "4px 6px", border: "1px solid #ddd", fontWeight: 700, textAlign: "right" }}>
                    PUNTAJE TOTAL TINETTI:
                  </td>
                  <td style={{ padding: "4px 6px", border: "1px solid #ddd", textAlign: "center", fontWeight: 800, color: "#1b5e20" }}>
                    {tinEqTotal + tinMaTotal}/28
                  </td>
                </tr>
              </tbody>
            </table>
          </Box>
          <FieldLine label="Observaciones Tinetti" name="tinetti_notes" value={form.tinetti_notes} onChange={handleChange} width="100%" multiline rows={2} readOnly={isReadOnly} />

          {/* Firma */}
          <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end" }}>
            <Box sx={{ width: 280, textAlign: "center" }}>
              <FieldLine label="" name="firma_paciente" value={form.firma_paciente} onChange={handleChange} width="100%" readOnly={isReadOnly} />
              <Typography fontSize={11} color="text.secondary" mt={0.5}>
                Nombre y firma de aceptación (Paciente / Cuidador / Familiar)
              </Typography>
              <Typography fontSize={10} color="text.secondary" mt={0.3}>
                NOM-004-SSA3-2012, Del Expediente Clínico
              </Typography>
            </Box>
          </Box>

        </Paper>
      </div>
      {/* ═══════════ end printable ═══════════ */}

      {/* Floating save bar (mobile) */}
      <Box className="no-print" sx={{ display: { xs: "flex", md: "none" }, gap: 1, mt: 2, justifyContent: "center" }}>
        <Button variant="outlined" onClick={() => saveEntry("draft")} disabled={saving || isReadOnly} size="small">
          Borrador
        </Button>
        <Button variant="contained" color="success" onClick={() => saveEntry("final")} disabled={saving || isReadOnly} size="small">
          Guardar en expediente
        </Button>
        <Button variant="contained" onClick={handlePrint} size="small">
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
