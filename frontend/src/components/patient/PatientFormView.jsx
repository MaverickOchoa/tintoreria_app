import React, { useState, useEffect } from "react";
import { useParams, useOutletContext, useNavigate } from "react-router-dom";
import { Box, CircularProgress, Button, Typography } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const CLINIC_API = import.meta.env.VITE_CLINIC_API_URL || "";

/* ── Print CSS ──────────────────────────────────────────────────────────────── */
const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #hoja-form-print, #hoja-form-print * { visibility: visible !important; }
  #hoja-form-print { position: absolute; left: 0; top: 0; width: 100%; font-family: Arial, sans-serif; }
  .no-print { display: none !important; }
  .page-break { page-break-before: always; }
  * { box-sizing: border-box; }
}
@media screen {
  #hoja-form-print { font-family: Arial, sans-serif; }
}
`;

/* ── Shared styles ─────────────────────────────────────────────────────────── */
const S = {
  page: {
    background: "#fff",
    padding: "24px",
    maxWidth: 860,
    margin: "0 auto",
    border: "1px solid #ccc",
    fontSize: 12,
    color: "#000",
    lineHeight: 1.4,
  },
  sectionBox: {
    border: "1.5px solid #000",
    marginBottom: 12,
  },
  sectionHeader: {
    background: "#dce3f0",
    padding: "3px 8px",
    fontWeight: 700,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderBottom: "1px solid #000",
  },
  sectionBody: {
    padding: "6px 8px",
  },
  row: {
    display: "flex",
    flexWrap: "wrap",
    gap: 0,
  },
};

/* ── Field box (label + value with underline) ─────────────────────────────── */
function F({ label, value, w = "auto", flex, multi }) {
  return (
    <div style={{ width: w, flex: flex || "0 0 auto", padding: "3px 6px", boxSizing: "border-box" }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#444", textTransform: "uppercase", marginBottom: 1 }}>
        {label}
      </div>
      <div style={{
        borderBottom: "1px solid #555",
        minHeight: multi ? 48 : 18,
        fontSize: 12,
        padding: "1px 0",
        whiteSpace: "pre-wrap",
        color: value ? "#000" : "#ccc",
      }}>
        {value || ""}
      </div>
    </div>
  );
}

/* ── Barthel scale ──────────────────────────────────────────────────────────── */
const BARTHEL = [
  { k: "comida",          l: "Comida",                 opts: [{v:0,l:"Incapaz"},{v:5,l:"Necesita ayuda"},{v:10,l:"Independiente"}] },
  { k: "traslado",        l: "Traslado cama-sillón",   opts: [{v:0,l:"Incapaz"},{v:5,l:"Gran ayuda"},{v:10,l:"Poca ayuda"},{v:15,l:"Independiente"}] },
  { k: "aseo",            l: "Aseo personal",          opts: [{v:0,l:"Dep."},{v:5,l:"Independiente"}] },
  { k: "retrete",         l: "Uso del retrete",        opts: [{v:0,l:"Dep."},{v:5,l:"Ayuda"},{v:10,l:"Independiente"}] },
  { k: "banio",           l: "Baño",                   opts: [{v:0,l:"Dep."},{v:5,l:"Independiente"}] },
  { k: "desplazamiento",  l: "Desplazamiento",         opts: [{v:0,l:"Inmóvil"},{v:5,l:"Silla"},{v:10,l:"Con ayuda"},{v:15,l:"Independiente"}] },
  { k: "escaleras",       l: "Escaleras",              opts: [{v:0,l:"Incapaz"},{v:5,l:"Ayuda"},{v:10,l:"Independiente"}] },
  { k: "vestido",         l: "Vestido",                opts: [{v:0,l:"Dep."},{v:5,l:"Ayuda"},{v:10,l:"Independiente"}] },
  { k: "deposicion",      l: "Control deposición",     opts: [{v:0,l:"Incont."},{v:5,l:"Ocasional"},{v:10,l:"Continente"}] },
  { k: "orina",           l: "Control orina",          opts: [{v:0,l:"Incont."},{v:5,l:"Ocasional"},{v:10,l:"Continente"}] },
];

const TINETTI_EQ = [
  { k:"eq1", l:"1. Equilibrio sentado",        opts:[{v:0,l:"Inestable"},{v:1,l:"Firme"}] },
  { k:"eq2", l:"2. Incorporación",             opts:[{v:0,l:"Incapaz"},{v:1,l:"Usa brazos"},{v:2,l:"Sin brazos"}] },
  { k:"eq3", l:"3. Intento incorporación",     opts:[{v:0,l:"Incapaz"},{v:1,l:">1 intento"},{v:2,l:"1er intento"}] },
  { k:"eq4", l:"4. Equilibrio al levantarse",  opts:[{v:0,l:"Inseguro"},{v:1,l:"Con apoyo"},{v:2,l:"Sin apoyo"}] },
  { k:"eq5", l:"5. Bipedestación",             opts:[{v:0,l:"Inseguro"},{v:1,l:"Con bastón"},{v:2,l:"Sin apoyo"}] },
  { k:"eq6", l:"6. Empujón",                   opts:[{v:0,l:"Cae"},{v:1,l:"Tambalea"},{v:2,l:"Firme"}] },
  { k:"eq7", l:"7. Ojos cerrados",             opts:[{v:0,l:"Inseguro"},{v:1,l:"Firme"}] },
  { k:"eq8a",l:"8A. Giro 360° pasos",          opts:[{v:0,l:"Discontinuos"},{v:1,l:"Continuos"}] },
  { k:"eq8b",l:"8B. Giro 360° seguridad",      opts:[{v:0,l:"Inseguro"},{v:1,l:"Seguro"}] },
  { k:"eq9", l:"9. Sentarse",                  opts:[{v:0,l:"Inseguro"},{v:1,l:"Usa brazos"},{v:2,l:"Suave"}] },
];

const TINETTI_M = [
  { k:"m1",l:"1. Inicio marcha",       opts:[{v:0,l:"Vacilación"},{v:1,l:"Sin vacilación"}] },
  { k:"m2",l:"2. Paso Der.",           opts:[{v:0,l:"No sobrepasa"},{v:1,l:"Sobrepasa"}] },
  { k:"m3",l:"3. Paso Izq.",           opts:[{v:0,l:"No sobrepasa"},{v:1,l:"Sobrepasa"}] },
  { k:"m4",l:"4. Simetría",            opts:[{v:0,l:"Desigual"},{v:1,l:"Igual"}] },
  { k:"m5",l:"5. Fluidez",             opts:[{v:0,l:"Discontinua"},{v:1,l:"Fluida"}] },
  { k:"m6",l:"6. Trayectoria",         opts:[{v:0,l:"Desviación"},{v:1,l:"Leve+apoyo"},{v:2,l:"Sin desviación"}] },
  { k:"m7",l:"7. Tronco",              opts:[{v:0,l:"Balanceo"},{v:1,l:"Sin balanceo"},{v:2,l:"Estable"}] },
  { k:"m8",l:"8. Postura marcha",      opts:[{v:0,l:"Talones sep."},{v:1,l:"Talones juntos"}] },
];

/* ── Checkbox-style option row ─────────────────────────────────────────────── */
function CheckRow({ label, value, opts }) {
  return (
    <tr>
      <td style={{ padding:"3px 6px", border:"1px solid #bbb", fontSize:11, fontWeight:600, width:"28%" }}>{label}</td>
      <td style={{ padding:"3px 6px", border:"1px solid #bbb" }}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"8px 16px" }}>
          {opts.map(o => {
            const sel = String(o.v) === String(value);
            return (
              <span key={o.v} style={{ display:"flex", alignItems:"center", gap:4, fontSize:11 }}>
                <span style={{
                  display:"inline-block", width:12, height:12, border:"1.5px solid #333",
                  borderRadius:2, background: sel ? "#1a3a8f" : "#fff",
                  flexShrink:0,
                }} />
                <span style={{ fontWeight: sel ? 700 : 400, color: sel ? "#000" : "#555" }}>
                  {o.v} — {o.l}
                </span>
              </span>
            );
          })}
        </div>
      </td>
      <td style={{ padding:"3px 6px", border:"1px solid #bbb", textAlign:"center", fontWeight:700, width:40, fontSize:13, color:"#1a3a8f" }}>
        {value !== "" && value !== undefined ? value : ""}
      </td>
    </tr>
  );
}

/* ── Main component ─────────────────────────────────────────────────────────── */
export default function PatientFormView() {
  const { entryId } = useParams();
  const { token } = useOutletContext();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!document.getElementById("hoja-pf-print")) {
      const tag = document.createElement("style");
      tag.id = "hoja-pf-print";
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

  if (loading) return (
    <Box sx={{ display:"flex", justifyContent:"center", mt:8 }}>
      <CircularProgress />
    </Box>
  );
  if (error) return (
    <Box sx={{ p:3 }}>
      <Typography color="error">{error}</Typography>
    </Box>
  );

  const d = entry?.form_data || {};
  const date = entry?.created_at
    ? new Date(entry.created_at).toLocaleDateString("es-MX", { dateStyle:"long" })
    : "";

  const barthelTotal = BARTHEL.reduce((s,i) => s + (Number(d[`barthel_${i.k}`]) || 0), 0);
  const barthelClass = barthelTotal < 20 ? "Dependencia Total"
    : barthelTotal <= 35 ? "Dependencia Severa"
    : barthelTotal <= 55 ? "Dependencia Moderada"
    : barthelTotal <= 95 ? "Dependencia Leve" : "Independencia";
  const tinEq = TINETTI_EQ.reduce((s,i) => s + (Number(d[`tinetti_${i.k}`]) || 0), 0);
  const tinM  = TINETTI_M.reduce((s,i) => s + (Number(d[`tinetti_${i.k}`]) || 0), 0);

  return (
    <Box sx={{ maxWidth:900, mx:"auto", p:{ xs:1, md:2 } }}>
      {/* Top bar */}
      <Box className="no-print" sx={{ display:"flex", alignItems:"center", gap:1, mb:2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} variant="outlined" size="small">
          Regresar
        </Button>
        <Typography variant="h6" fontWeight={800} sx={{ flex:1, ml:1, fontSize:{ xs:14, md:18 } }}>
          Hoja Clínica — {date}
        </Typography>
        <Button startIcon={<PrintIcon />} onClick={() => window.print()} variant="contained" size="small"
          sx={{ bgcolor:"#1a3a8f", "&:hover":{ bgcolor:"#122a6e" } }}>
          Imprimir
        </Button>
      </Box>

      {/* ═══════════ FORM SHEET ═══════════ */}
      <div id="hoja-form-print">
        <div style={S.page}>

          {/* ── Header ──────────────────────────────────────────────── */}
          <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:10 }}>
            <tbody>
              <tr>
                <td style={{ width:"70%", padding:"4px 0" }}>
                  <div style={{ fontSize:18, fontWeight:900, color:"#1a3a8f", letterSpacing:1 }}>
                    HOJA CLÍNICA NEUROLÓGICA
                  </div>
                  <div style={{ fontSize:11, color:"#555", marginTop:2 }}>
                    NOM-004-SSA3-2012 · Del Expediente Clínico
                  </div>
                </td>
                <td style={{ width:"30%", textAlign:"right", verticalAlign:"top" }}>
                  <table style={{ borderCollapse:"collapse", marginLeft:"auto" }}>
                    <tbody>
                      <tr>
                        <td style={{ border:"1px solid #000", padding:"2px 8px", fontSize:11, fontWeight:700 }}>Fecha:</td>
                        <td style={{ border:"1px solid #000", padding:"2px 8px", fontSize:11, minWidth:100 }}>{d.fecha || date}</td>
                      </tr>
                      <tr>
                        <td style={{ border:"1px solid #000", padding:"2px 8px", fontSize:11, fontWeight:700 }}>Sesión N°:</td>
                        <td style={{ border:"1px solid #000", padding:"2px 8px", fontSize:11 }}>{d.sesion_num || ""}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Datos del Paciente ────────────────────────────────── */}
          <div style={S.sectionBox}>
            <div style={S.sectionHeader}>I. Datos del Paciente</div>
            <div style={S.sectionBody}>
              <div style={S.row}>
                <F label="Nombre completo" value={d.nombre_paciente} flex="2" />
                <F label="Edad" value={d.edad} w="80px" />
                <F label="Fecha de nacimiento" value={d.fecha_nacimiento} w="160px" />
                <F label="Estado civil" value={d.estado_civil} w="130px" />
              </div>
              <div style={S.row}>
                <F label="Ocupación" value={d.ocupacion} flex="1" />
                <F label="Teléfono" value={d.telefono} w="160px" />
              </div>
              <div style={S.row}>
                <F label="Domicilio" value={d.domicilio} flex="1" />
              </div>
              <div style={{ ...S.row, marginTop:4 }}>
                <F label="Talla (cm)" value={d.talla} w="100px" />
                <F label="Peso (kg)" value={d.peso} w="100px" />
                <F label="IMC" value={d.imc} w="80px" />
                <F label="SatO₂ (%)" value={d.sat02} w="80px" />
                <F label="F/C" value={d.fc} w="100px" />
                <F label="T/A" value={d.ta} w="110px" />
                <F label="T/C (°C)" value={d.tc} w="90px" />
              </div>
            </div>
          </div>

          {/* ── Historia Clínica ────────────────────────────────────── */}
          <div style={S.sectionBox}>
            <div style={S.sectionHeader}>II. Historia Clínica</div>
            <div style={S.sectionBody}>
              <F label="AHF — Antecedentes Heredofamiliares" value={d.ahf} flex="1" multi />
              <div style={{ height:6 }} />
              <F label="APP — Antecedentes Patológicos Personales (incluir Qx)" value={d.app} flex="1" multi />
              <div style={{ height:6 }} />
              <F label="APNP — Antecedentes Personales No Patológicos (incluir AVDH)" value={d.apnp} flex="1" multi />
              <div style={{ ...S.row, marginTop:6 }}>
                <F label="AGO" value={d.ago} flex="1" />
              </div>
              <div style={{ ...S.row, marginTop:4 }}>
                <F label="Alergias" value={d.alergias} flex="1" />
                <F label="Medicamentos actuales" value={d.medicamentos} flex="1" />
              </div>
            </div>
          </div>

          {/* ── Motivo + Plan ───────────────────────────────────────── */}
          <div style={S.sectionBox}>
            <div style={S.sectionHeader}>III. Motivo de Consulta</div>
            <div style={S.sectionBody}>
              <F label="" value={d.motivo} flex="1" multi />
            </div>
          </div>

          <div style={S.sectionBox}>
            <div style={S.sectionHeader}>IV. Objetivos, Plan de Tratamiento e Intervención</div>
            <div style={S.sectionBody}>
              <F label="" value={d.objetivos} flex="1" multi />
            </div>
          </div>

          {/* ── Interconsulta ─────────────────────────────────────── */}
          {d.notas_interconsulta && (
            <div style={S.sectionBox}>
              <div style={S.sectionHeader}>V. Notas de Interconsulta</div>
              <div style={S.sectionBody}>
                <F label="" value={d.notas_interconsulta} flex="1" multi />
              </div>
            </div>
          )}

          {/* ── SOAP ─────────────────────────────────────────────── */}
          {(d.soap_s || d.soap_o || d.soap_a || d.soap_p) && (
            <>
              <div className="page-break" />
              <div style={S.sectionBox}>
                <div style={S.sectionHeader}>VI. Nota de Seguimiento — SOAP</div>
                <div style={S.sectionBody}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                    <F label="S — Subjetivo (síntomas, queja principal)" value={d.soap_s} flex="1" multi />
                    <F label="O — Objetivo (hallazgos, mediciones)" value={d.soap_o} flex="1" multi />
                    <F label="A — Análisis (evaluación, diagnóstico)" value={d.soap_a} flex="1" multi />
                    <F label="P — Plan (tratamiento, próxima sesión)" value={d.soap_p} flex="1" multi />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── ISNCSCI ─────────────────────────────────────────── */}
          {(d.nli || d.ais || d.uer) && (
            <div style={S.sectionBox}>
              <div style={S.sectionHeader}>VII. ISNCSCI — Clasificación Neurológica de Lesión Medular</div>
              <div style={S.sectionBody}>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:4 }}>
                  <F label="UE Derecho (máx 25)" value={d.uer} flex="1" />
                  <F label="UE Izquierdo (máx 25)" value={d.uel} flex="1" />
                  <F label="LE Derecho (máx 25)" value={d.ler} flex="1" />
                  <F label="LE Izquierdo (máx 25)" value={d.lel} flex="1" />
                  <F label="LT Derecho (máx 56)" value={d.lte} flex="1" />
                  <F label="LT Izquierdo (máx 56)" value={d.ltl} flex="1" />
                  <F label="PP Derecho (máx 56)" value={d.pper} flex="1" />
                  <F label="PP Izquierdo (máx 56)" value={d.ppel} flex="1" />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:4, marginTop:4 }}>
                  <F label="NLI (Nivel Neurológico)" value={d.nli} flex="1" />
                  <F label="Completa / Incompleta" value={d.complete_incomplete} flex="1" />
                  <F label="AIS (Escala ASIA)" value={d.ais} flex="1" />
                </div>
                {d.isncsci_comments && <div style={{ marginTop:4 }}><F label="Comentarios" value={d.isncsci_comments} flex="1" multi /></div>}
              </div>
            </div>
          )}

          {/* ── Barthel ─────────────────────────────────────────── */}
          {BARTHEL.some(i => d[`barthel_${i.k}`] !== "" && d[`barthel_${i.k}`] !== undefined) && (
            <>
              <div className="page-break" />
              <div style={S.sectionBox}>
                <div style={S.sectionHeader}>VIII. Escala de Barthel — Índice de Independencia Funcional</div>
                <div style={S.sectionBody}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                    <thead>
                      <tr style={{ background:"#dce3f0" }}>
                        <th style={{ border:"1px solid #bbb", padding:"4px 6px", textAlign:"left", width:"22%" }}>Actividad</th>
                        <th style={{ border:"1px solid #bbb", padding:"4px 6px", textAlign:"left" }}>Opciones</th>
                        <th style={{ border:"1px solid #bbb", padding:"4px 6px", textAlign:"center", width:50 }}>Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {BARTHEL.map(item => <CheckRow key={item.k} label={item.l} value={d[`barthel_${item.k}`]} opts={item.opts} />)}
                      <tr style={{ background:"#dce3f0" }}>
                        <td colSpan={2} style={{ border:"1px solid #bbb", padding:"4px 6px", fontWeight:700, textAlign:"right" }}>
                          Total: {barthelTotal}/100 — <span style={{ color:"#1a3a8f" }}>{barthelClass}</span>
                        </td>
                        <td style={{ border:"1px solid #bbb", padding:"4px 6px", textAlign:"center", fontWeight:900, fontSize:15, color:"#1a3a8f" }}>
                          {barthelTotal}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── Ashworth + Campbell ─────────────────────────────── */}
          {(d.ashworth_score || d.campbell_score) && (
            <div style={S.sectionBox}>
              <div style={S.sectionHeader}>IX. Escalas de Tono Muscular</div>
              <div style={{ ...S.sectionBody, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {/* Ashworth */}
                <div>
                  <div style={{ fontWeight:700, fontSize:11, marginBottom:4, borderBottom:"1px solid #bbb", paddingBottom:2 }}>
                    Escala de Ashworth Modificada
                  </div>
                  {[
                    { v:"0",  l:"0 — Sin aumento del tono" },
                    { v:"1",  l:"1 — Ligero aumento (bloqueo al final del arco)" },
                    { v:"1+", l:"1+ — Ligero aumento (más de la mitad del arco)" },
                    { v:"2",  l:"2 — Aumento más pronunciado, movilidad fácil" },
                    { v:"3",  l:"3 — Considerable, movimiento pasivo difícil" },
                    { v:"4",  l:"4 — Rígido en flexión o extensión" },
                  ].map(o => (
                    <div key={o.v} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4, fontSize:11 }}>
                      <div style={{
                        width:13, height:13, border:"1.5px solid #333", borderRadius:2, flexShrink:0,
                        background: d.ashworth_score === o.v ? "#1a3a8f" : "#fff",
                      }} />
                      <span style={{ fontWeight: d.ashworth_score === o.v ? 700 : 400 }}>{o.l}</span>
                    </div>
                  ))}
                </div>
                {/* Campbell */}
                <div>
                  <div style={{ fontWeight:700, fontSize:11, marginBottom:4, borderBottom:"1px solid #bbb", paddingBottom:2 }}>
                    Escala de Campbell
                  </div>
                  {[
                    { v:"-3", l:"-3 — Hipotonía Severa (sin resistencia)" },
                    { v:"-2", l:"-2 — Hipotonía Severa (axial/proximal)" },
                    { v:"-1", l:"-1 — Hipotonía Leve" },
                    { v:"0",  l:"0 — Normal" },
                    { v:"+1", l:"+1 — Hipertonía Leve" },
                    { v:"+2", l:"+2 — Hipertonía Moderada" },
                    { v:"+3", l:"+3 — Hipertonía Severa" },
                  ].map(o => (
                    <div key={o.v} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4, fontSize:11 }}>
                      <div style={{
                        width:13, height:13, border:"1.5px solid #333", borderRadius:2, flexShrink:0,
                        background: d.campbell_score === o.v ? "#1a3a8f" : "#fff",
                      }} />
                      <span style={{ fontWeight: d.campbell_score === o.v ? 700 : 400 }}>{o.l}</span>
                    </div>
                  ))}
                </div>
              </div>
              {d.tono_notes && (
                <div style={{ ...S.sectionBody, paddingTop:0 }}>
                  <F label="Observaciones" value={d.tono_notes} flex="1" multi />
                </div>
              )}
            </div>
          )}

          {/* ── Tinetti ─────────────────────────────────────────── */}
          {TINETTI_EQ.some(i => d[`tinetti_${i.k}`] !== "" && d[`tinetti_${i.k}`] !== undefined) && (
            <>
              <div className="page-break" />
              <div style={S.sectionBox}>
                <div style={S.sectionHeader}>X. Escala de Tinetti — Equilibrio y Marcha</div>
                <div style={S.sectionBody}>
                  <div style={{ fontWeight:700, fontSize:11, marginBottom:4 }}>EQUILIBRIO (máximo 16 puntos)</div>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, marginBottom:8 }}>
                    <tbody>
                      {TINETTI_EQ.map(i => <CheckRow key={i.k} label={i.l} value={d[`tinetti_${i.k}`]} opts={i.opts} />)}
                      <tr style={{ background:"#dce3f0" }}>
                        <td colSpan={2} style={{ border:"1px solid #bbb", padding:"4px 6px", fontWeight:700, textAlign:"right" }}>
                          Puntaje Equilibrio {tinEq < 10 ? "(⚠ Alto riesgo de caída)" : ""}:
                        </td>
                        <td style={{ border:"1px solid #bbb", textAlign:"center", fontWeight:900, fontSize:14, color: tinEq < 10 ? "#c00" : "#1a3a8f" }}>
                          {tinEq}/16
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div style={{ fontWeight:700, fontSize:11, marginBottom:4 }}>MARCHA (máximo 12 puntos)</div>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                    <tbody>
                      {TINETTI_M.map(i => <CheckRow key={i.k} label={i.l} value={d[`tinetti_${i.k}`]} opts={i.opts} />)}
                      <tr style={{ background:"#dce3f0" }}>
                        <td colSpan={2} style={{ border:"1px solid #bbb", padding:"4px 6px", fontWeight:700, textAlign:"right" }}>
                          Puntaje Marcha:
                        </td>
                        <td style={{ border:"1px solid #bbb", textAlign:"center", fontWeight:900, fontSize:14, color:"#1a3a8f" }}>
                          {tinM}/12
                        </td>
                      </tr>
                      <tr style={{ background:"#c8d8f0" }}>
                        <td colSpan={2} style={{ border:"1px solid #bbb", padding:"5px 6px", fontWeight:900, textAlign:"right", fontSize:12 }}>
                          PUNTAJE TOTAL TINETTI:
                        </td>
                        <td style={{ border:"1px solid #bbb", textAlign:"center", fontWeight:900, fontSize:16, color:"#1a3a8f" }}>
                          {tinEq + tinM}/28
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {d.tinetti_notes && <div style={{ marginTop:6 }}><F label="Observaciones" value={d.tinetti_notes} flex="1" multi /></div>}
                </div>
              </div>
            </>
          )}

          {/* ── Firma ───────────────────────────────────────────── */}
          <div style={{ marginTop:24, display:"flex", justifyContent:"flex-end" }}>
            <div style={{ width:280, textAlign:"center" }}>
              <div style={{ borderBottom:"1.5px solid #333", minHeight:28, fontSize:12, paddingBottom:2 }}>
                {d.firma_paciente || ""}
              </div>
              <div style={{ fontSize:10, color:"#555", marginTop:3 }}>
                Nombre y firma — Paciente / Cuidador / Familiar
              </div>
              <div style={{ fontSize:9, color:"#888", marginTop:2 }}>
                NOM-004-SSA3-2012, Del Expediente Clínico
              </div>
            </div>
          </div>

        </div>{/* end S.page */}
      </div>
      {/* ═══════════ end printable ═══════════ */}
    </Box>
  );
}
