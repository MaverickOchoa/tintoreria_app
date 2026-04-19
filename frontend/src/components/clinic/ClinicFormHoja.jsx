import React, { useState, useEffect, useCallback } from "react";
import { useParams, useOutletContext, useNavigate, useSearchParams } from "react-router-dom";
import {
  Box, Typography, Button, CircularProgress, Snackbar, Alert,
  Tooltip, Chip,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import SaveIcon from "@mui/icons-material/Save";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { CLINIC_API } from "./clinicTheme";

// ─── Cloudinary PDF page images ───────────────────────────────────────────────
const PAGES = [
  "https://res.cloudinary.com/dfzelstrw/image/upload/v1776571295/clinica/hoja_neurologica_p1.png",
  "https://res.cloudinary.com/dfzelstrw/image/upload/v1776571297/clinica/hoja_neurologica_p2.png",
  "https://res.cloudinary.com/dfzelstrw/image/upload/v1776571299/clinica/hoja_neurologica_p3.png",
  "https://res.cloudinary.com/dfzelstrw/image/upload/v1776571301/clinica/hoja_neurologica_p4.png",
  "https://res.cloudinary.com/dfzelstrw/image/upload/v1776571304/clinica/hoja_neurologica_p5.png",
  "https://res.cloudinary.com/dfzelstrw/image/upload/v1776571309/clinica/hoja_neurologica_p6.png",
  "https://res.cloudinary.com/dfzelstrw/image/upload/v1776571312/clinica/hoja_neurologica_p7.png",
  "https://res.cloudinary.com/dfzelstrw/image/upload/v1776571315/clinica/hoja_neurologica_p8.png",
];
// Aspect ratio: 1980/1530 = 129.41%
const ASPECT = "129.41%";

// ─── Field position maps (% of image width/height) ───────────────────────────
const P1_FIELDS = [
  { key: "nombre_paciente", l: 21,  t: 9.2,  w: 73  },
  { key: "edad",            l: 9,   t: 12,   w: 12  },
  { key: "fecha_nacimiento",l: 40,  t: 12,   w: 17  },
  { key: "estado_civil",    l: 67,  t: 12,   w: 27  },
  { key: "ocupacion",       l: 12,  t: 14.5, w: 46  },
  { key: "telefono",        l: 67,  t: 14.5, w: 27  },
  { key: "domicilio",       l: 12,  t: 17,   w: 82  },
  { key: "talla",           l: 8,   t: 19.5, w: 11  },
  { key: "peso",            l: 23,  t: 19.5, w: 10  },
  { key: "imc",             l: 38,  t: 19.5, w: 18  },
  { key: "sat02",           l: 64,  t: 19.5, w: 30  },
  { key: "fc",              l: 5,   t: 26.5, w: 27  },
  { key: "ta",              l: 38,  t: 26.5, w: 21  },
  { key: "tc",              l: 64,  t: 26.5, w: 30  },
  { key: "ahf",             l: 5,   t: 34.8, w: 17.5, h: 18.5, multi: true },
  { key: "app",             l: 23.5,t: 34.8, w: 22.5, h: 18.5, multi: true },
  { key: "apnp",            l: 47,  t: 34.8, w: 21.5, h: 18.5, multi: true },
  { key: "ago",             l: 70,  t: 34.8, w: 23,   h: 18.5, multi: true },
  { key: "alergias",        l: 12,  t: 54.5, w: 32,   h: 4.5,  multi: true },
  { key: "medicamentos",    l: 58,  t: 54.5, w: 35,   h: 4.5,  multi: true },
  { key: "motivo",          l: 5,   t: 65,   w: 88,   h: 10.5, multi: true },
  { key: "objetivos",       l: 5,   t: 82,   w: 88,   h: 8.5,  multi: true },
];

const P2_FIELDS = [
  { key: "notas_interconsulta", l: 5, t: 13.5, w: 88, h: 19, multi: true },
  { key: "firma_paciente",      l: 17, t: 60,   w: 65 },
];

// ─── Print CSS ────────────────────────────────────────────────────────────────
const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #hoja-clinica-print, #hoja-clinica-print * { visibility: visible !important; }
  #hoja-clinica-print { position: absolute; left: 0; top: 0; width: 100%; }
  .no-print { display: none !important; }
  .page-break { page-break-before: always; }
}
@page { size: letter portrait; margin: 0; }
`;

// ─── Input/textarea style inside PDF overlay ──────────────────────────────────
const inputStyle = {
  width: "100%",
  border: "none",
  background: "rgba(255,255,255,0.01)",
  outline: "none",
  fontFamily: "Arial, sans-serif",
  color: "#c0005a",
  fontWeight: 600,
  padding: "1px 2px",
  boxSizing: "border-box",
  lineHeight: 1.35,
};

// ─── PDF Page overlay component ───────────────────────────────────────────────
function PdfPage({ url, fields = [], form, onChange, readOnly, className }) {
  const fSize = "1.05vw";
  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        paddingTop: ASPECT,
        marginBottom: 20,
        boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
        borderRadius: 4,
        overflow: "hidden",
        pageBreakAfter: "always",
      }}
    >
      <img
        src={url}
        alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", display: "block" }}
      />
      {fields.map((f) => (
        <div
          key={f.key}
          style={{
            position: "absolute",
            left: `${f.l}%`,
            top: `${f.t}%`,
            width: `${f.w}%`,
            height: f.h ? `${f.h}%` : "auto",
            zIndex: 2,
          }}
        >
          {readOnly ? (
            <div style={{ fontSize: fSize, color: "#c0005a", fontWeight: 600, whiteSpace: "pre-wrap", padding: "1px 2px", lineHeight: 1.35 }}>
              {form[f.key] || ""}
            </div>
          ) : f.multi ? (
            <textarea
              name={f.key}
              value={form[f.key] || ""}
              onChange={onChange}
              style={{ ...inputStyle, fontSize: fSize, height: "100%", resize: "none" }}
            />
          ) : (
            <input
              type="text"
              name={f.key}
              value={form[f.key] || ""}
              onChange={onChange}
              style={{ ...inputStyle, fontSize: fSize }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Reference-only page (no overlay inputs) ──────────────────────────────────
function RefPage({ url, className }) {
  return (
    <div
      className={className}
      style={{
        width: "100%",
        paddingTop: ASPECT,
        position: "relative",
        marginBottom: 8,
        boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
        borderRadius: 4,
        overflow: "hidden",
        pageBreakAfter: "always",
      }}
    >
      <img src={url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill" }} />
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SH({ children }) {
  return (
    <div style={{
      background: "#f06292",
      color: "#fff",
      fontWeight: 700,
      fontSize: 13,
      padding: "4px 12px",
      borderRadius: "6px 6px 0 0",
      marginTop: 16,
      marginBottom: 0,
    }}>
      {children}
    </div>
  );
}

function SectionBox({ children }) {
  return (
    <div style={{
      border: "1.5px solid #f06292",
      borderTop: "none",
      borderRadius: "0 0 6px 6px",
      padding: "10px 12px",
      marginBottom: 12,
      background: "#fff",
    }}>
      {children}
    </div>
  );
}

// ─── Barthel items ────────────────────────────────────────────────────────────
const BARTHEL_ITEMS = [
  { key: "comida",    label: "Comer",                  opts: [{v:0,l:"Incapaz"},{v:5,l:"Necesita ayuda"},{v:10,l:"Independiente"}] },
  { key: "traslado",  label: "Trasladarse silla-cama", opts: [{v:0,l:"Incapaz"},{v:5,l:"Gran ayuda"},{v:10,l:"Poca ayuda"},{v:15,l:"Independiente"}] },
  { key: "aseo",      label: "Aseo personal",          opts: [{v:0,l:"Necesita ayuda"},{v:5,l:"Independiente"}] },
  { key: "retrete",   label: "Uso del retrete",        opts: [{v:0,l:"Dependiente"},{v:5,l:"Necesita ayuda"},{v:10,l:"Independiente"}] },
  { key: "banio",     label: "Bañarse",                opts: [{v:0,l:"Dependiente"},{v:5,l:"Independiente"}] },
  { key: "desplazamiento", label: "Desplazarse",       opts: [{v:0,l:"Inmóvil"},{v:5,l:"Silla de ruedas"},{v:10,l:"Con ayuda"},{v:15,l:"Independiente"}] },
  { key: "escaleras", label: "Subir/bajar escaleras",  opts: [{v:0,l:"Incapaz"},{v:5,l:"Necesita ayuda"},{v:10,l:"Independiente"}] },
  { key: "vestido",   label: "Vestirse",               opts: [{v:0,l:"Dependiente"},{v:5,l:"Necesita ayuda"},{v:10,l:"Independiente"}] },
  { key: "deposicion",label: "Control de heces",       opts: [{v:0,l:"Incontinente"},{v:5,l:"Accidente ocasional"},{v:10,l:"Continente"}] },
  { key: "orina",     label: "Control de orina",       opts: [{v:0,l:"Incontinente"},{v:5,l:"Accidente ocasional"},{v:10,l:"Continente"}] },
];

// ─── Tinetti equilibrio ───────────────────────────────────────────────────────
const TINETTI_EQ = [
  { key:"eq1", label:"1. Equilibrio sentado",            opts:[{v:0,l:"Se inclina/desliza"},{v:1,l:"Firme, seguro"}] },
  { key:"eq2", label:"2. Incorporación",                 opts:[{v:0,l:"Incapaz sin ayuda"},{v:1,l:"Usa brazos"},{v:2,l:"Sin usar brazos"}] },
  { key:"eq3", label:"3. Intento de incorporación",      opts:[{v:0,l:"Incapaz"},{v:1,l:">1 intento"},{v:2,l:"1er intento"}] },
  { key:"eq4", label:"4. Equilibrio al levantarse",      opts:[{v:0,l:"Inseguro"},{v:1,l:"Con bastón/apoyo"},{v:2,l:"Sin apoyo"}] },
  { key:"eq5", label:"5. Bipedestación",                 opts:[{v:0,l:"Inseguro"},{v:1,l:"Con bastón <8cm"},{v:2,l:"Sin apoyo"}] },
  { key:"eq6", label:"6. Recibe empujón",                opts:[{v:0,l:"Cae"},{v:1,l:"Tambalea"},{v:2,l:"Firme"}] },
  { key:"eq7", label:"7. Ojos cerrados",                 opts:[{v:0,l:"Inseguro"},{v:1,l:"Firme"}] },
  { key:"eq8a",label:"8A. Giro 360° (pasos)",            opts:[{v:0,l:"Discontinuos"},{v:1,l:"Continuos"}] },
  { key:"eq8b",label:"8B. Giro 360° (seguridad)",        opts:[{v:0,l:"Inseguro"},{v:1,l:"Seguro"}] },
  { key:"eq9", label:"9. Sentarse",                      opts:[{v:0,l:"Inseguro/cae"},{v:1,l:"Usa brazos"},{v:2,l:"Suave, seguro"}] },
];

const TINETTI_M = [
  { key:"m1", label:"1. Inicio de la marcha",         opts:[{v:0,l:"Vacilación"},{v:1,l:"Sin vacilación"}] },
  { key:"m2", label:"2. Longitud paso derecho",       opts:[{v:0,l:"No sobrepasa izq."},{v:1,l:"Sobrepasa izq."}] },
  { key:"m3", label:"3. Longitud paso izquierdo",     opts:[{v:0,l:"No sobrepasa der."},{v:1,l:"Sobrepasa der."}] },
  { key:"m4", label:"4. Simetría del paso",           opts:[{v:0,l:"Desigual"},{v:1,l:"Igual"}] },
  { key:"m5", label:"5. Fluidez del paso",            opts:[{v:0,l:"Discontinua"},{v:1,l:"Fluida"}] },
  { key:"m6", label:"6. Trayectoria",                 opts:[{v:0,l:"Desviación marcada"},{v:1,l:"Leve o con apoyo"},{v:2,l:"Sin desviación"}] },
  { key:"m7", label:"7. Tronco",                      opts:[{v:0,l:"Balanceo/usa apoyo"},{v:1,l:"Sin balanceo c/flex"},{v:2,l:"Estable sin apoyo"}] },
  { key:"m8", label:"8. Postura en la marcha",        opts:[{v:0,l:"Talones separados"},{v:1,l:"Talones juntos"}] },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function ClinicFormHoja() {
  const { patientId } = useParams();
  const [searchParams] = useSearchParams();
  const entryId = searchParams.get("entry_id");
  const appointmentId = searchParams.get("appointment_id");
  const { token, claims } = useOutletContext();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("draft");
  const [currentEntryId, setCurrentEntryId] = useState(entryId ? Number(entryId) : null);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });

  const [form, setForm] = useState({
    nombre_paciente: "",
    fecha: new Date().toLocaleDateString("es-MX"),
    sesion_num: "",
    edad: "", fecha_nacimiento: "", estado_civil: "", ocupacion: "",
    telefono: "", domicilio: "",
    talla: "", peso: "", imc: "", sat02: "",
    fc: "", ta: "", tc: "",
    ahf: "", app: "", apnp: "", ago: "", alergias: "", medicamentos: "",
    motivo: "", objetivos: "",
    notas_interconsulta: "",
    soap_s: "", soap_o: "", soap_a: "", soap_p: "",
    isncsci_comments: "",
    uer: "", uel: "", ler: "", lel: "",
    lte: "", ltl: "", pper: "", ppel: "",
    nli: "", complete_incomplete: "", ais: "",
    ...Object.fromEntries(BARTHEL_ITEMS.map(i => [`barthel_${i.key}`, ""])),
    ashworth_score: "", campbell_score: "", tono_notes: "",
    ...Object.fromEntries(TINETTI_EQ.map(i => [`tinetti_${i.key}`, ""])),
    ...Object.fromEntries(TINETTI_M.map(i => [`tinetti_${i.key}`, ""])),
    tinetti_notes: "",
    firma_paciente: "",
  });

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    if (!document.getElementById("hoja-print-style")) {
      const tag = document.createElement("style");
      tag.id = "hoja-print-style";
      tag.innerHTML = PRINT_STYLE;
      document.head.appendChild(tag);
    }

    const fetchData = async () => {
      try {
        const pRes = await fetch(`${CLINIC_API}/clinic/patients/${patientId}`, { headers });
        const p = await pRes.json();
        setPatient(p);

        const w = p.weight_kg || "";
        const h = p.height_cm || "";
        const imc = w && h ? String(Math.round(w / ((h / 100) ** 2) * 10) / 10) : "";
        const nombre = `${p.full_name || ""} ${p.last_name || ""}`.trim();

        setForm(prev => ({
          ...prev,
          nombre_paciente: nombre,
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
          edad: p.age ? String(p.age) : "",
        }));

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
  }, []);

  const handleRadio = (name, value) => setForm(prev => ({ ...prev, [name]: value }));

  const barthelTotal = BARTHEL_ITEMS.reduce((s, i) => s + (Number(form[`barthel_${i.key}`]) || 0), 0);
  const barthelClass =
    barthelTotal < 20 ? "Dependencia Total" :
    barthelTotal <= 35 ? "Dependencia Severa" :
    barthelTotal <= 55 ? "Dependencia Moderada" :
    barthelTotal <= 95 ? "Dependencia Leve" : "Independencia";
  const tinEqTotal = TINETTI_EQ.reduce((s, i) => s + (Number(form[`tinetti_${i.key}`]) || 0), 0);
  const tinMaTotal = TINETTI_M.reduce((s, i) => s + (Number(form[`tinetti_${i.key}`]) || 0), 0);

  const saveEntry = async (finalStatus = "draft") => {
    setSaving(true);
    try {
      const body = {
        patient_id: Number(patientId),
        appointment_id: appointmentId ? Number(appointmentId) : null,
        business_id: claims?.business_id,
        branch_id: claims?.active_branch_id || claims?.branch_id,
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
      setSnack({ open: true, msg: finalStatus === "final" ? "Guardado en expediente del paciente" : "Borrador guardado", severity: "success" });
    } catch (err) {
      setSnack({ open: true, msg: "Error al guardar: " + err.message, severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}><CircularProgress /></Box>;

  const isReadOnly = status === "final";
  const patientName = patient ? `${patient.full_name || ""} ${patient.last_name || ""}`.trim() : "";

  // ── Scoring table helper ──────────────────────────────────────────────────
  const ScoreTable = ({ items, prefix }) => (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 4 }}>
      <tbody>
        {items.map(item => {
          const val = form[`${prefix}_${item.key}`];
          return (
            <tr key={item.key} style={{ borderBottom: "1px solid #f8bbd0" }}>
              <td style={{ padding: "4px 8px", width: "32%", fontWeight: 600, color: "#555" }}>{item.label}</td>
              <td style={{ padding: "4px 8px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
                  {item.opts.map(opt => (
                    <label key={opt.v} style={{ display: "flex", alignItems: "center", gap: 4, cursor: isReadOnly ? "default" : "pointer", fontSize: 12 }}>
                      <input
                        type="radio"
                        name={`${prefix}_${item.key}`}
                        value={String(opt.v)}
                        checked={String(val) === String(opt.v)}
                        onChange={isReadOnly ? undefined : () => handleRadio(`${prefix}_${item.key}`, String(opt.v))}
                        disabled={isReadOnly}
                      />
                      {opt.v} — {opt.l}
                    </label>
                  ))}
                </div>
              </td>
              <td style={{ padding: "4px 8px", textAlign: "center", width: 44, fontWeight: 700, color: "#c0005a" }}>
                {val !== "" && val !== undefined ? val : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 1, md: 2 } }}>
      {/* ── Toolbar ── */}
      <Box className="no-print" sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} variant="outlined" size="small">Regresar</Button>
        <Typography variant="h6" sx={{ fontWeight: 700, flex: 1, ml: 1, fontSize: { xs: 13, md: 16 } }}>
          Hoja Clínica — {patientName}
        </Typography>
        {status === "final" && (
          <Chip icon={<CheckCircleIcon />} label="Guardado en expediente" color="success" size="small" />
        )}
        <Tooltip title="Guardar borrador">
          <span>
            <Button startIcon={<SaveIcon />} onClick={() => saveEntry("draft")} disabled={saving || isReadOnly} variant="outlined" size="small">
              {saving ? "Guardando…" : "Borrador"}
            </Button>
          </span>
        </Tooltip>
        <Tooltip title="Guardar en expediente del paciente (no editable después)">
          <span>
            <Button startIcon={<CheckCircleIcon />} onClick={() => saveEntry("final")} disabled={saving || isReadOnly} variant="contained" color="success" size="small">
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

      {/* ══════════════ PRINTABLE AREA ══════════════ */}
      <div id="hoja-clinica-print">

        {/* PAGE 1 — Datos del Paciente + Historia Clínica + Motivo + Objetivos */}
        <PdfPage url={PAGES[0]} fields={P1_FIELDS} form={form} onChange={handleChange} readOnly={isReadOnly} />

        {/* PAGE 2 — Notas Interconsulta + Consentimiento + Firma */}
        <PdfPage url={PAGES[1]} fields={P2_FIELDS} form={form} onChange={handleChange} readOnly={isReadOnly} />

        {/* PAGES 3-4 — Seguimiento (reference) */}
        <RefPage url={PAGES[2]} />
        <RefPage url={PAGES[3]} />

        {/* SOAP Notes digital section */}
        <SH>Notas SOAP — Seguimiento</SH>
        <SectionBox>
          {[
            { name: "soap_s", label: "S — Subjetivo (síntomas, queja principal)" },
            { name: "soap_o", label: "O — Objetivo (hallazgos, mediciones)" },
            { name: "soap_a", label: "A — Análisis (diagnóstico)" },
            { name: "soap_p", label: "P — Plan (tratamiento, próxima sesión)" },
          ].map(f => (
            <div key={f.name} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#c0005a", textTransform: "uppercase", marginBottom: 3 }}>{f.label}</div>
              {isReadOnly ? (
                <div style={{ fontSize: 13, whiteSpace: "pre-wrap", padding: "4px 0", borderBottom: "1px solid #f8bbd0" }}>{form[f.name] || "—"}</div>
              ) : (
                <textarea
                  name={f.name}
                  value={form[f.name] || ""}
                  onChange={handleChange}
                  rows={3}
                  style={{ width: "100%", border: "1px solid #f8bbd0", borderRadius: 4, padding: "6px", fontSize: 13, resize: "vertical", outline: "none", fontFamily: "inherit" }}
                />
              )}
            </div>
          ))}
        </SectionBox>

        {/* PAGE 5 — ISNCSCI (reference) */}
        <RefPage url={PAGES[4]} />

        {/* ISNCSCI digital section */}
        <SH>ISNCSCI — Clasificación Neurológica de Lesión Medular</SH>
        <SectionBox>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 8 }}>
            {[
              { name: "uer",  label: "UE Derecho (máx 25)" },
              { name: "uel",  label: "UE Izquierdo (máx 25)" },
              { name: "ler",  label: "LE Derecho (máx 25)" },
              { name: "lel",  label: "LE Izquierdo (máx 25)" },
              { name: "lte",  label: "LT Derecho (máx 56)" },
              { name: "ltl",  label: "LT Izquierdo (máx 56)" },
              { name: "pper", label: "PP Derecho (máx 56)" },
              { name: "ppel", label: "PP Izquierdo (máx 56)" },
            ].map(f => (
              <div key={f.name}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#888", marginBottom: 2 }}>{f.label}</div>
                <input
                  type="text" name={f.name} value={form[f.name] || ""} onChange={handleChange} readOnly={isReadOnly}
                  style={{ width: "100%", border: "1px solid #f8bbd0", borderRadius: 3, padding: "4px 6px", fontSize: 13 }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 8 }}>
            {[
              { name: "nli",                label: "NLI" },
              { name: "complete_incomplete", label: "Completa / Incompleta" },
              { name: "ais",                label: "AIS (Escala ASIA)" },
            ].map(f => (
              <div key={f.name}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#888", marginBottom: 2 }}>{f.label}</div>
                <input
                  type="text" name={f.name} value={form[f.name] || ""} onChange={handleChange} readOnly={isReadOnly}
                  style={{ width: "100%", border: "1px solid #f8bbd0", borderRadius: 3, padding: "4px 6px", fontSize: 13 }}
                />
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#888", marginBottom: 2 }}>Comentarios</div>
          <textarea
            name="isncsci_comments" value={form.isncsci_comments || ""} onChange={handleChange} readOnly={isReadOnly} rows={2}
            style={{ width: "100%", border: "1px solid #f8bbd0", borderRadius: 3, padding: "6px", fontSize: 13, resize: "vertical", fontFamily: "inherit" }}
          />
        </SectionBox>

        {/* PAGE 6 — Barthel (reference) */}
        <RefPage url={PAGES[5]} />

        {/* Barthel scoring */}
        <SH>Escala de Barthel — Puntaje del Paciente</SH>
        <SectionBox>
          <ScoreTable items={BARTHEL_ITEMS} prefix="barthel" />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <div style={{ background: "#fce4ec", borderRadius: 6, padding: "6px 16px", fontWeight: 700, color: "#c0005a" }}>
              Total: {barthelTotal}/100 — {barthelClass}
            </div>
          </div>
        </SectionBox>

        {/* PAGE 7 — Ashworth + Campbell (reference) */}
        <RefPage url={PAGES[6]} />

        {/* Tono muscular scoring */}
        <SH>Tono Muscular — Puntaje del Paciente</SH>
        <SectionBox>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6, color: "#c0005a" }}>Escala de Ashworth</div>
              {[{v:"0",l:"0 — Normal"},{v:"1",l:"1 — Ligero aumento (bloqueo al final)"},{v:"1+",l:"1+ — Ligero aumento (>mitad arco)"},{v:"2",l:"2 — Más pronunciado, mueve con facilidad"},{v:"3",l:"3 — Considerable, mov. pasivo difícil"},{v:"4",l:"4 — Rígido"}].map(opt => (
                <label key={opt.v} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, cursor: isReadOnly ? "default" : "pointer", fontSize: 12 }}>
                  <input type="radio" name="ashworth_score" value={opt.v} checked={form.ashworth_score === opt.v} onChange={isReadOnly ? undefined : () => handleRadio("ashworth_score", opt.v)} disabled={isReadOnly} />
                  {opt.l}
                </label>
              ))}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6, color: "#c0005a" }}>Escala de Campbell</div>
              {[{v:"-3",l:"-3 Hipotonía Severa (sin resistencia)"},{v:"-2",l:"-2 Hipotonía Severa (axial/proximal)"},{v:"-1",l:"-1 Hipotonía Leve"},{v:"0",l:"0 Normal"},{v:"+1",l:"+1 Hipertonía Leve"},{v:"+2",l:"+2 Hipertonía Moderada"},{v:"+3",l:"+3 Hipertonía Severa"}].map(opt => (
                <label key={opt.v} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, cursor: isReadOnly ? "default" : "pointer", fontSize: 12 }}>
                  <input type="radio" name="campbell_score" value={opt.v} checked={form.campbell_score === opt.v} onChange={isReadOnly ? undefined : () => handleRadio("campbell_score", opt.v)} disabled={isReadOnly} />
                  {opt.l}
                </label>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#888", marginBottom: 2 }}>Observaciones de tono muscular</div>
            <textarea
              name="tono_notes" value={form.tono_notes || ""} onChange={handleChange} readOnly={isReadOnly} rows={2}
              style={{ width: "100%", border: "1px solid #f8bbd0", borderRadius: 3, padding: "6px", fontSize: 13, resize: "vertical", fontFamily: "inherit" }}
            />
          </div>
        </SectionBox>

        {/* PAGE 8 — Tinetti (reference) */}
        <RefPage url={PAGES[7]} />

        {/* Tinetti scoring */}
        <SH>Escala de Tinetti — Puntaje del Paciente</SH>
        <SectionBox>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#c0005a", marginBottom: 6 }}>EQUILIBRIO (máx 16 pts)</div>
          <ScoreTable items={TINETTI_EQ} prefix="tinetti" />
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <div style={{ background: tinEqTotal < 10 ? "#ffebee" : "#fce4ec", borderRadius: 6, padding: "5px 14px", fontWeight: 700, color: tinEqTotal < 10 ? "#b71c1c" : "#c0005a", fontSize: 13 }}>
              Equilibrio: {tinEqTotal}/16 {tinEqTotal < 10 ? "⚠ Alto riesgo de caída" : ""}
            </div>
          </div>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#c0005a", marginBottom: 6 }}>MARCHA (máx 12 pts)</div>
          <ScoreTable items={TINETTI_M} prefix="tinetti" />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <div style={{ background: "#fce4ec", borderRadius: 6, padding: "5px 14px", fontWeight: 700, color: "#c0005a", fontSize: 13 }}>
              Marcha: {tinMaTotal}/12
            </div>
            <div style={{ background: "#c0005a", borderRadius: 6, padding: "5px 14px", fontWeight: 700, color: "#fff", fontSize: 13 }}>
              Total Tinetti: {tinEqTotal + tinMaTotal}/28
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#888", marginBottom: 2 }}>Observaciones Tinetti</div>
            <textarea
              name="tinetti_notes" value={form.tinetti_notes || ""} onChange={handleChange} readOnly={isReadOnly} rows={2}
              style={{ width: "100%", border: "1px solid #f8bbd0", borderRadius: 3, padding: "6px", fontSize: 13, resize: "vertical", fontFamily: "inherit" }}
            />
          </div>
        </SectionBox>

      </div>
      {/* ══════════════ end printable ══════════════ */}

      {/* Floating mobile save bar */}
      <Box className="no-print" sx={{ display: { xs: "flex", md: "none" }, gap: 1, mt: 2, justifyContent: "center" }}>
        <Button variant="outlined" onClick={() => saveEntry("draft")} disabled={saving || isReadOnly} size="small">Borrador</Button>
        <Button variant="contained" color="success" onClick={() => saveEntry("final")} disabled={saving || isReadOnly} size="small">Guardar</Button>
        <Button variant="contained" onClick={() => window.print()} size="small">Imprimir</Button>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))} sx={{ width: "100%" }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
