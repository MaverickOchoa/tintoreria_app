import React, { useState, useEffect } from "react";
import { useParams, useOutletContext, useNavigate } from "react-router-dom";
import { Box, Typography, Button, CircularProgress, Divider, Paper } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const CLINIC_API = import.meta.env.VITE_CLINIC_API_URL || "";

/* ── Print CSS ─────────────────────────────────────────────────────────────── */
const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #hoja-print-patient, #hoja-print-patient * { visibility: visible !important; }
  #hoja-print-patient { position: absolute; left: 0; top: 0; width: 100%; }
  .no-print { display: none !important; }
  .page-break { page-break-before: always; }
}
`;

/* ── Read-only field ────────────────────────────────────────────────────────── */
function Field({ label, value, width = "100%", multiline = false }) {
  if (!label && !value) return null;
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", width, verticalAlign: "top", marginBottom: 8, paddingRight: 10 }}>
      {label && (
        <span style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 }}>
          {label}
        </span>
      )}
      <span style={{
        borderBottom: "1.5px solid #d1d5db",
        minHeight: multiline ? 56 : 22,
        fontSize: 13,
        color: "#111",
        whiteSpace: "pre-wrap",
        padding: "2px 0",
        display: "block",
      }}>
        {value || ""}
      </span>
    </span>
  );
}

function SectionTitle({ children }) {
  return (
    <Typography sx={{
      fontWeight: 800, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2,
      color: "#4361ee", borderBottom: "2px solid #4361ee", pb: 0.4, mb: 1.5, mt: 2,
    }}>
      {children}
    </Typography>
  );
}

/* ── Barthel ────────────────────────────────────────────────────────────────── */
const BARTHEL_ITEMS = [
  { key: "comida", label: "Comida", opts: [{ v: 0, l: "Incapaz" }, { v: 5, l: "Necesita ayuda" }, { v: 10, l: "Independiente" }] },
  { key: "traslado", label: "Traslado cama-sillón", opts: [{ v: 0, l: "Incapaz" }, { v: 5, l: "Gran ayuda" }, { v: 10, l: "Poca ayuda" }, { v: 15, l: "Independiente" }] },
  { key: "aseo", label: "Aseo personal", opts: [{ v: 0, l: "Necesita ayuda" }, { v: 5, l: "Independiente" }] },
  { key: "retrete", label: "Uso del retrete", opts: [{ v: 0, l: "Dependiente" }, { v: 5, l: "Necesita ayuda" }, { v: 10, l: "Independiente" }] },
  { key: "banio", label: "Baño", opts: [{ v: 0, l: "Dependiente" }, { v: 5, l: "Independiente" }] },
  { key: "desplazamiento", label: "Desplazamiento", opts: [{ v: 0, l: "Inmóvil" }, { v: 5, l: "Silla independiente" }, { v: 10, l: "Camina con ayuda" }, { v: 15, l: "Independiente" }] },
  { key: "escaleras", label: "Escaleras", opts: [{ v: 0, l: "Incapaz" }, { v: 5, l: "Necesita ayuda" }, { v: 10, l: "Independiente" }] },
  { key: "vestido", label: "Vestido", opts: [{ v: 0, l: "Dependiente" }, { v: 5, l: "Necesita ayuda" }, { v: 10, l: "Independiente" }] },
  { key: "deposicion", label: "Control deposición", opts: [{ v: 0, l: "Incontinente" }, { v: 5, l: "Accidente ocasional" }, { v: 10, l: "Continente" }] },
  { key: "orina", label: "Control orina", opts: [{ v: 0, l: "Incontinente" }, { v: 5, l: "Accidente ocasional" }, { v: 10, l: "Continente" }] },
];

const TINETTI_EQ = [
  { key: "eq1", label: "1. Equilibrio sentado", opts: [{ v: 0, l: "Inestable" }, { v: 1, l: "Firme" }] },
  { key: "eq2", label: "2. Incorporación", opts: [{ v: 0, l: "Incapaz sin ayuda" }, { v: 1, l: "Usa brazos" }, { v: 2, l: "Sin usar brazos" }] },
  { key: "eq3", label: "3. Intento incorporación", opts: [{ v: 0, l: "Incapaz" }, { v: 1, l: ">1 intento" }, { v: 2, l: "1er intento" }] },
  { key: "eq4", label: "4. Equilibrio al levantarse", opts: [{ v: 0, l: "Inseguro" }, { v: 1, l: "Con apoyo" }, { v: 2, l: "Sin apoyo" }] },
  { key: "eq5", label: "5. Equilibrio bipedestación", opts: [{ v: 0, l: "Inseguro" }, { v: 1, l: "Con bastón" }, { v: 2, l: "Sin apoyo" }] },
  { key: "eq6", label: "6. Empujón", opts: [{ v: 0, l: "Cae" }, { v: 1, l: "Tambalea" }, { v: 2, l: "Firme" }] },
  { key: "eq7", label: "7. Ojos cerrados", opts: [{ v: 0, l: "Inseguro" }, { v: 1, l: "Firme" }] },
  { key: "eq8a", label: "8A. Giro 360° pasos", opts: [{ v: 0, l: "Discontinuos" }, { v: 1, l: "Continuos" }] },
  { key: "eq8b", label: "8B. Giro 360° seguridad", opts: [{ v: 0, l: "Inseguro" }, { v: 1, l: "Seguro" }] },
  { key: "eq9", label: "9. Sentarse", opts: [{ v: 0, l: "Inseguro" }, { v: 1, l: "Usa brazos" }, { v: 2, l: "Suave y seguro" }] },
];

const TINETTI_M = [
  { key: "m1", label: "1. Inicio marcha", opts: [{ v: 0, l: "Vacilación" }, { v: 1, l: "Sin vacilación" }] },
  { key: "m2", label: "2. Paso Der. longitud/altura", opts: [{ v: 0, l: "No sobrepasa" }, { v: 1, l: "Sobrepasa" }] },
  { key: "m3", label: "3. Paso Izq. longitud/altura", opts: [{ v: 0, l: "No sobrepasa" }, { v: 1, l: "Sobrepasa" }] },
  { key: "m4", label: "4. Simetría", opts: [{ v: 0, l: "Desigual" }, { v: 1, l: "Igual" }] },
  { key: "m5", label: "5. Fluidez", opts: [{ v: 0, l: "Discontinua" }, { v: 1, l: "Fluida" }] },
  { key: "m6", label: "6. Trayectoria", opts: [{ v: 0, l: "Marcada desviación" }, { v: 1, l: "Leve + apoyo" }, { v: 2, l: "Sin desviación" }] },
  { key: "m7", label: "7. Tronco", opts: [{ v: 0, l: "Balanceo/apoyo" }, { v: 1, l: "Sin balanceo" }, { v: 2, l: "Estable, sin apoyo" }] },
  { key: "m8", label: "8. Postura marcha", opts: [{ v: 0, l: "Talones separados" }, { v: 1, l: "Talones juntos" }] },
];

function ScaleRow({ label, value, opts }) {
  const selected = opts.find(o => String(o.v) === String(value));
  return (
    <tr>
      <td style={{ padding: "4px 8px", border: "1px solid #e5e7eb", fontSize: 12, fontWeight: 600, width: "30%" }}>{label}</td>
      <td style={{ padding: "4px 8px", border: "1px solid #e5e7eb", fontSize: 12 }}>
        {opts.map(o => (
          <span key={o.v} style={{
            display: "inline-block", marginRight: 10, padding: "1px 6px", borderRadius: 4,
            background: String(o.v) === String(value) ? "#4361ee" : "transparent",
            color: String(o.v) === String(value) ? "#fff" : "#6b7280",
            fontWeight: String(o.v) === String(value) ? 700 : 400,
          }}>
            {o.v} — {o.l}
          </span>
        ))}
      </td>
      <td style={{ padding: "4px 8px", border: "1px solid #e5e7eb", textAlign: "center", fontSize: 13, fontWeight: 800, color: "#4361ee", width: 50 }}>
        {selected ? selected.v : "—"}
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
    if (!document.getElementById("hoja-patient-print-style")) {
      const tag = document.createElement("style");
      tag.id = "hoja-patient-print-style";
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
  if (error) return <Box sx={{ p: 3 }}><Typography color="error">{error}</Typography></Box>;

  const d = entry?.form_data || {};
  const date = entry?.created_at
    ? new Date(entry.created_at).toLocaleDateString("es-MX", { dateStyle: "long" })
    : "";

  const barthelTotal = BARTHEL_ITEMS.reduce((s, i) => s + (Number(d[`barthel_${i.key}`]) || 0), 0);
  const barthelClass = barthelTotal < 20 ? "Dependencia Total" : barthelTotal <= 35 ? "Dependencia Severa" :
    barthelTotal <= 55 ? "Dependencia Moderada" : barthelTotal <= 95 ? "Dependencia Leve" : "Independencia";
  const tinEqTotal = TINETTI_EQ.reduce((s, i) => s + (Number(d[`tinetti_${i.key}`]) || 0), 0);
  const tinMaTotal = TINETTI_M.reduce((s, i) => s + (Number(d[`tinetti_${i.key}`]) || 0), 0);

  return (
    <Box sx={{ maxWidth: 860, mx: "auto", p: { xs: 1.5, md: 3 } }}>
      {/* Top bar */}
      <Box className="no-print" sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} variant="outlined" size="small">
          Regresar
        </Button>
        <Typography variant="h6" fontWeight={800} sx={{ flex: 1, ml: 1 }}>
          Hoja Clínica — {date}
        </Typography>
        <Button startIcon={<PrintIcon />} onClick={() => window.print()} variant="contained" size="small"
          sx={{ bgcolor: "#4361ee" }}>
          Imprimir
        </Button>
      </Box>

      {/* ═══════ PRINTABLE ═══════ */}
      <div id="hoja-print-patient">
        <Paper elevation={0} sx={{ p: { xs: 2, md: 4 }, border: "1px solid #e5e7eb", borderRadius: 3 }}>

          {/* Header */}
          <Box sx={{ textAlign: "center", mb: 2 }}>
            <Typography variant="h5" fontWeight={900} color="#4361ee" letterSpacing={1}>
              Hoja Clínica Neurológica
            </Typography>
            {date && <Typography variant="body2" color="text.secondary">{date}</Typography>}
          </Box>
          <Divider sx={{ mb: 2 }} />

          {/* ── Datos del paciente */}
          <SectionTitle>Datos del Paciente</SectionTitle>
          <Box sx={{ display: "flex", flexWrap: "wrap" }}>
            <Field label="Nombre" value={d.nombre_paciente} width="55%" />
            <Field label="Fecha" value={d.fecha} width="20%" />
            <Field label="Sesión N°" value={d.sesion_num} width="25%" />
            <Field label="Edad" value={d.edad} width="15%" />
            <Field label="Fecha de Nacimiento" value={d.fecha_nacimiento} width="25%" />
            <Field label="Estado Civil" value={d.estado_civil} width="20%" />
            <Field label="Ocupación" value={d.ocupacion} width="40%" />
            <Field label="Teléfono" value={d.telefono} width="25%" />
            <Field label="Domicilio" value={d.domicilio} width="75%" />
            <Field label="Talla (cm)" value={d.talla} width="15%" />
            <Field label="Peso (kg)" value={d.peso} width="15%" />
            <Field label="IMC" value={d.imc} width="15%" />
            <Field label="SatO₂" value={d.sat02} width="15%" />
          </Box>

          {/* ── Signos vitales */}
          <SectionTitle>Signos Vitales</SectionTitle>
          <Box sx={{ display: "flex", flexWrap: "wrap" }}>
            <Field label="F/C (frec. cardíaca)" value={d.fc} width="33%" />
            <Field label="T/A (tensión arterial)" value={d.ta} width="33%" />
            <Field label="TC (temp. corporal)" value={d.tc} width="33%" />
          </Box>

          {/* ── Historia clínica */}
          <SectionTitle>Historia Clínica</SectionTitle>
          <Box sx={{ display: "flex", flexWrap: "wrap" }}>
            <Field label="AHF (Antecedentes Heredofamiliares)" value={d.ahf} width="100%" multiline />
            <Field label="APP (Antecedentes Patológicos — incluir Qx)" value={d.app} width="100%" multiline />
            <Field label="APNP (Antecedentes No Patológicos — incluir AVDH)" value={d.apnp} width="100%" multiline />
            <Field label="AGO" value={d.ago} width="100%" />
            <Field label="Alergias" value={d.alergias} width="50%" />
            <Field label="Medicamentos actuales" value={d.medicamentos} width="50%" />
          </Box>

          {/* ── Motivo */}
          <SectionTitle>Motivo de Consulta</SectionTitle>
          <Field label="" value={d.motivo} width="100%" multiline />

          {/* ── Plan */}
          <SectionTitle>Objetivos, Plan de Tratamiento e Intervención</SectionTitle>
          <Field label="" value={d.objetivos} width="100%" multiline />

          {/* ── Interconsulta */}
          {d.notas_interconsulta && <>
            <div className="page-break" />
            <SectionTitle>Notas Interconsulta</SectionTitle>
            <Field label="" value={d.notas_interconsulta} width="100%" multiline />
          </>}

          {/* ── SOAP */}
          {(d.soap_s || d.soap_o || d.soap_a || d.soap_p) && <>
            <div className="page-break" />
            <SectionTitle>Seguimiento — Notas SOAP</SectionTitle>
            <Field label="S — Subjetivo" value={d.soap_s} width="100%" multiline />
            <Field label="O — Objetivo" value={d.soap_o} width="100%" multiline />
            <Field label="A — Análisis" value={d.soap_a} width="100%" multiline />
            <Field label="P — Plan" value={d.soap_p} width="100%" multiline />
          </>}

          {/* ── ISNCSCI */}
          {(d.nli || d.ais) && <>
            <div className="page-break" />
            <SectionTitle>ISNCSCI — Clasificación Neurológica</SectionTitle>
            <Box sx={{ display: "flex", flexWrap: "wrap" }}>
              <Field label="UE Derecho" value={d.uer} width="25%" />
              <Field label="UE Izquierdo" value={d.uel} width="25%" />
              <Field label="LE Derecho" value={d.ler} width="25%" />
              <Field label="LE Izquierdo" value={d.lel} width="25%" />
              <Field label="LT Derecho" value={d.lte} width="25%" />
              <Field label="LT Izquierdo" value={d.ltl} width="25%" />
              <Field label="PP Derecho" value={d.pper} width="25%" />
              <Field label="PP Izquierdo" value={d.ppel} width="25%" />
              <Field label="NLI" value={d.nli} width="33%" />
              <Field label="Completa / Incompleta" value={d.complete_incomplete} width="33%" />
              <Field label="AIS" value={d.ais} width="33%" />
              <Field label="Comentarios" value={d.isncsci_comments} width="100%" multiline />
            </Box>
          </>}

          {/* ── Barthel */}
          {BARTHEL_ITEMS.some(i => d[`barthel_${i.key}`] !== "") && <>
            <div className="page-break" />
            <SectionTitle>Escala de Barthel — Independencia Funcional</SectionTitle>
            <Box sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#eff2ff" }}>
                    <th style={{ textAlign: "left", padding: "5px 8px", border: "1px solid #e5e7eb" }}>Actividad</th>
                    <th style={{ padding: "5px 8px", border: "1px solid #e5e7eb" }}>Resultado</th>
                    <th style={{ padding: "5px 8px", border: "1px solid #e5e7eb", width: 60 }}>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {BARTHEL_ITEMS.map(item => {
                    const val = d[`barthel_${item.key}`];
                    const opt = item.opts.find(o => String(o.v) === String(val));
                    return (
                      <tr key={item.key}>
                        <td style={{ padding: "4px 8px", border: "1px solid #e5e7eb", fontWeight: 600 }}>{item.label}</td>
                        <td style={{ padding: "4px 8px", border: "1px solid #e5e7eb", color: opt ? "#111" : "#bbb" }}>
                          {opt ? opt.l : "—"}
                        </td>
                        <td style={{ padding: "4px 8px", border: "1px solid #e5e7eb", textAlign: "center", fontWeight: 700, color: "#4361ee" }}>
                          {val !== "" && val !== undefined ? val : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: "#eff2ff" }}>
                    <td colSpan={2} style={{ padding: "6px 8px", border: "1px solid #e5e7eb", fontWeight: 700, textAlign: "right" }}>
                      Total: {barthelTotal}/100 — {barthelClass}
                    </td>
                    <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb", textAlign: "center", fontWeight: 900, fontSize: 15, color: "#4361ee" }}>
                      {barthelTotal}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Box>
          </>}

          {/* ── Ashworth + Campbell */}
          {(d.ashworth_score || d.campbell_score) && <>
            <div className="page-break" />
            <SectionTitle>Tono Muscular — Ashworth &amp; Campbell</SectionTitle>
            <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <Box>
                <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>Ashworth</Typography>
                {["0", "1", "1+", "2", "3", "4"].map(v => (
                  <Box key={v} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <Box sx={{
                      width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                      bgcolor: d.ashworth_score === v ? "#4361ee" : "#e5e7eb",
                      border: "1.5px solid",
                      borderColor: d.ashworth_score === v ? "#4361ee" : "#d1d5db",
                    }} />
                    <Typography fontSize={12} fontWeight={d.ashworth_score === v ? 700 : 400}>
                      {v} — {["Normal", "Ligero (fin)", "Ligero (>mitad)", "Más pronunciado", "Considerable", "Rígido"][["0","1","1+","2","3","4"].indexOf(v)]}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Box>
                <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>Campbell</Typography>
                {["-3","-2","-1","0","+1","+2","+3"].map((v, idx) => (
                  <Box key={v} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <Box sx={{
                      width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                      bgcolor: d.campbell_score === v ? "#4361ee" : "#e5e7eb",
                      border: "1.5px solid",
                      borderColor: d.campbell_score === v ? "#4361ee" : "#d1d5db",
                    }} />
                    <Typography fontSize={12} fontWeight={d.campbell_score === v ? 700 : 400}>
                      {v} — {["Hipotonía Severa (sin resist.)","Hipotonía Severa (axial)","Hipotonía Leve","Normal","Hipertonía Leve","Hipertonía Moderada","Hipertonía Severa"][idx]}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            {d.tono_notes && <Field label="Notas" value={d.tono_notes} width="100%" multiline />}
          </>}

          {/* ── Tinetti */}
          {TINETTI_EQ.some(i => d[`tinetti_${i.key}`] !== "") && <>
            <div className="page-break" />
            <SectionTitle>Escala de Tinetti — Equilibrio y Marcha</SectionTitle>
            <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>EQUILIBRIO (máx 16)</Typography>
            <Box sx={{ overflowX: "auto", mb: 1.5 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <tbody>
                  {TINETTI_EQ.map(item => <ScaleRow key={item.key} label={item.label} value={d[`tinetti_${item.key}`]} opts={item.opts} />)}
                  <tr style={{ background: "#eff2ff" }}>
                    <td colSpan={2} style={{ padding: "5px 8px", border: "1px solid #e5e7eb", fontWeight: 700, textAlign: "right" }}>
                      Puntaje Equilibrio ({tinEqTotal < 10 ? "⚠ Alto riesgo de caída" : "Riesgo bajo"}):
                    </td>
                    <td style={{ padding: "5px 8px", border: "1px solid #e5e7eb", textAlign: "center", fontWeight: 900, fontSize: 14, color: tinEqTotal < 10 ? "#dc2626" : "#16a34a" }}>
                      {tinEqTotal}/16
                    </td>
                  </tr>
                </tbody>
              </table>
            </Box>
            <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>MARCHA (máx 12)</Typography>
            <Box sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <tbody>
                  {TINETTI_M.map(item => <ScaleRow key={item.key} label={item.label} value={d[`tinetti_${item.key}`]} opts={item.opts} />)}
                  <tr style={{ background: "#eff2ff" }}>
                    <td colSpan={2} style={{ padding: "5px 8px", border: "1px solid #e5e7eb", fontWeight: 700, textAlign: "right" }}>
                      Puntaje Marcha:
                    </td>
                    <td style={{ padding: "5px 8px", border: "1px solid #e5e7eb", textAlign: "center", fontWeight: 900, fontSize: 14, color: "#4361ee" }}>
                      {tinMaTotal}/12
                    </td>
                  </tr>
                  <tr style={{ background: "#dcfce7" }}>
                    <td colSpan={2} style={{ padding: "5px 8px", border: "1px solid #e5e7eb", fontWeight: 800, textAlign: "right" }}>
                      PUNTAJE TOTAL TINETTI:
                    </td>
                    <td style={{ padding: "5px 8px", border: "1px solid #e5e7eb", textAlign: "center", fontWeight: 900, fontSize: 15, color: "#15803d" }}>
                      {tinEqTotal + tinMaTotal}/28
                    </td>
                  </tr>
                </tbody>
              </table>
            </Box>
            {d.tinetti_notes && <Field label="Observaciones" value={d.tinetti_notes} width="100%" multiline />}
          </>}

          {/* Firma */}
          <Box sx={{ mt: 5, display: "flex", justifyContent: "flex-end" }}>
            <Box sx={{ width: 260, textAlign: "center" }}>
              <Box sx={{ borderBottom: "1.5px solid #6b7280", minHeight: 28, mb: 0.5 }}>
                <Typography fontSize={12}>{d.firma_paciente || ""}</Typography>
              </Box>
              <Typography fontSize={10} color="text.secondary">Nombre y firma — Paciente / Cuidador / Familiar</Typography>
              <Typography fontSize={9} color="text.secondary" mt={0.3}>NOM-004-SSA3-2012</Typography>
            </Box>
          </Box>

        </Paper>
      </div>
      {/* ═══════ end printable ═══════ */}
    </Box>
  );
}
