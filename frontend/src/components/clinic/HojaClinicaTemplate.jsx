/**
 * HojaClinicaTemplate.jsx
 * CSS/JSX recreation of KeiPelvic clinical form — 8 pages
 * Used by ClinicFormHoja (editable) and PatientFormView (read-only)
 */
import React from "react";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  rose:      "#c0005a",
  pink:      "#f48fb1",
  pinkDark:  "#f06292",
  pinkBg:    "#fce4ec",
  pinkLight: "#f8bbd0",
  white:     "#ffffff",
  text:      "#2d2d2d",
  gray:      "#757575",
};

// ─── Print / Page CSS ─────────────────────────────────────────────────────────
export const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #hoja-print, #hoja-print * { visibility: visible !important; }
  #hoja-print { position: fixed; left: 0; top: 0; width: 100%; }
  .no-print { display: none !important; }
  .hoja-page { page-break-after: always; break-after: page; }
  .hoja-page:last-child { page-break-after: avoid; }
}
@page { size: letter portrait; margin: 0; }
`;

// ─── Shared UI primitives ─────────────────────────────────────────────────────
function PageWrapper({ pageNum, children }) {
  return (
    <div
      className="hoja-page"
      style={{
        background: C.white,
        border: `2px solid ${C.pink}`,
        borderRadius: 10,
        width: "100%",
        maxWidth: 816,
        margin: "0 auto 28px",
        padding: "20px 24px 24px",
        boxSizing: "border-box",
        position: "relative",
        boxShadow: "0 3px 18px rgba(192,0,90,0.10)",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        fontSize: 12,
        color: C.text,
        minHeight: 900,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, borderBottom: `2px solid ${C.pinkLight}`, paddingBottom: 10 }}>
        {/* Left: Title */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.rose, textTransform: "uppercase", letterSpacing: 2 }}>Ficha Médica</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.rose, lineHeight: 1 }}>Hoja Clínica</div>
          <div style={{ fontSize: 9, color: C.pinkDark, fontStyle: "italic" }}>Fisioterapia Pelvic · Rehabilitación Neurológica</div>
        </div>
        {/* Center: Clinic brand */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: C.rose, fontStyle: "italic", letterSpacing: -0.5, lineHeight: 1 }}>KeiPelvic</div>
          <div style={{ fontSize: 8, color: C.gray, letterSpacing: 1 }}>FISIOTERAPIA · NEUROLOGÍA · PELVIPERINEOLOGÍA</div>
        </div>
        {/* Right: Page number */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{
            width: 38, height: 38, borderRadius: "50%",
            background: C.rose, color: C.white,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, fontSize: 13,
          }}>
            P.{pageNum}
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}

function SectionPill({ children }) {
  return (
    <div style={{
      display: "inline-block",
      background: C.pinkBg,
      border: `1.5px solid ${C.pink}`,
      borderRadius: 20,
      padding: "2px 14px",
      fontWeight: 700,
      fontSize: 10,
      color: C.rose,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 6,
      marginTop: 12,
    }}>
      {children}
    </div>
  );
}

function FieldRow({ children, style }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 8, ...style }}>
      {children}
    </div>
  );
}

function Field({ label, name, value, onChange, readOnly, width = "auto", flex, multiline, rows = 3, style }) {
  const base = {
    background: "transparent",
    border: "none",
    borderBottom: `1.5px solid ${C.pinkLight}`,
    outline: "none",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    fontSize: 12,
    color: readOnly ? C.gray : C.text,
    width: "100%",
    padding: "2px 4px",
    boxSizing: "border-box",
    lineHeight: 1.4,
    ...style,
  };
  return (
    <div style={{ flex: flex || undefined, width: width !== "auto" ? width : undefined, minWidth: 0 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: C.rose, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
        {label}
      </div>
      {multiline ? (
        <textarea
          name={name}
          value={value || ""}
          onChange={onChange}
          readOnly={readOnly}
          rows={rows}
          style={{ ...base, resize: "vertical", minHeight: rows * 18 }}
        />
      ) : (
        <input
          type="text"
          name={name}
          value={value || ""}
          onChange={onChange}
          readOnly={readOnly}
          style={base}
        />
      )}
    </div>
  );
}

function TableHeader({ cols, colWidths }) {
  return (
    <thead>
      <tr>
        {cols.map((c, i) => (
          <th key={i} style={{
            background: C.pinkBg,
            color: C.rose,
            fontWeight: 700,
            fontSize: 10,
            textTransform: "uppercase",
            padding: "5px 8px",
            textAlign: "left",
            border: `1px solid ${C.pinkLight}`,
            width: colWidths ? colWidths[i] : undefined,
          }}>
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

const tCell = {
  border: `1px solid ${C.pinkLight}`,
  padding: "4px 6px",
  verticalAlign: "top",
};

const tInput = {
  width: "100%",
  border: "none",
  outline: "none",
  background: "transparent",
  fontFamily: "'Segoe UI', Arial, sans-serif",
  fontSize: 11,
  color: C.text,
  resize: "vertical",
};

function RadioOpts({ items, prefix, itemKey, form, onRadio, readOnly }) {
  const fullKey = `${prefix}_${itemKey}`;
  const val = form[fullKey];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 14px" }}>
      {items.map(opt => (
        <label key={opt.v} style={{ display: "flex", alignItems: "center", gap: 4, cursor: readOnly ? "default" : "pointer", fontSize: 11 }}>
          <input
            type="radio"
            name={fullKey}
            value={String(opt.v)}
            checked={String(val) === String(opt.v)}
            onChange={readOnly ? undefined : () => onRadio(fullKey, String(opt.v))}
            disabled={readOnly}
            style={{ accentColor: C.rose }}
          />
          <span style={{ color: C.text }}>{opt.v}</span>
          <span style={{ color: C.gray }}>— {opt.l}</span>
        </label>
      ))}
    </div>
  );
}

// ─── Barthel ──────────────────────────────────────────────────────────────────
const BARTHEL_ITEMS = [
  { key: "comida",       label: "Comer",                  opts: [{v:0,l:"Incapaz"},{v:5,l:"Necesita ayuda"},{v:10,l:"Independiente"}] },
  { key: "traslado",     label: "Trasladarse silla-cama", opts: [{v:0,l:"Incapaz"},{v:5,l:"Gran ayuda"},{v:10,l:"Poca ayuda"},{v:15,l:"Independiente"}] },
  { key: "aseo",         label: "Aseo personal",          opts: [{v:0,l:"Necesita ayuda"},{v:5,l:"Independiente"}] },
  { key: "retrete",      label: "Uso del retrete",        opts: [{v:0,l:"Dependiente"},{v:5,l:"Necesita ayuda"},{v:10,l:"Independiente"}] },
  { key: "banio",        label: "Bañarse",                opts: [{v:0,l:"Dependiente"},{v:5,l:"Independiente"}] },
  { key: "desplazamiento",label:"Desplazarse",            opts: [{v:0,l:"Inmóvil"},{v:5,l:"Silla de ruedas"},{v:10,l:"Con ayuda"},{v:15,l:"Independiente"}] },
  { key: "escaleras",    label: "Subir/bajar escaleras",  opts: [{v:0,l:"Incapaz"},{v:5,l:"Necesita ayuda"},{v:10,l:"Independiente"}] },
  { key: "vestido",      label: "Vestirse",               opts: [{v:0,l:"Dependiente"},{v:5,l:"Necesita ayuda"},{v:10,l:"Independiente"}] },
  { key: "deposicion",   label: "Control de heces",       opts: [{v:0,l:"Incontinente"},{v:5,l:"Accidente ocasional"},{v:10,l:"Continente"}] },
  { key: "orina",        label: "Control de orina",       opts: [{v:0,l:"Incontinente"},{v:5,l:"Accidente ocasional"},{v:10,l:"Continente"}] },
];

// ─── Tinetti ──────────────────────────────────────────────────────────────────
const TINETTI_EQ = [
  { key:"eq1", label:"1. Equilibrio sentado",       opts:[{v:0,l:"Se inclina/desliza"},{v:1,l:"Firme, seguro"}] },
  { key:"eq2", label:"2. Incorporación",            opts:[{v:0,l:"Incapaz sin ayuda"},{v:1,l:"Usa brazos"},{v:2,l:"Sin usar brazos"}] },
  { key:"eq3", label:"3. Intento de incorporación", opts:[{v:0,l:"Incapaz"},{v:1,l:">1 intento"},{v:2,l:"1er intento"}] },
  { key:"eq4", label:"4. Equilibrio al levantarse", opts:[{v:0,l:"Inseguro"},{v:1,l:"Con bastón/apoyo"},{v:2,l:"Sin apoyo"}] },
  { key:"eq5", label:"5. Bipedestación",            opts:[{v:0,l:"Inseguro"},{v:1,l:"Con bastón <8cm"},{v:2,l:"Sin apoyo"}] },
  { key:"eq6", label:"6. Recibe empujón",           opts:[{v:0,l:"Cae"},{v:1,l:"Tambalea"},{v:2,l:"Firme"}] },
  { key:"eq7", label:"7. Ojos cerrados",            opts:[{v:0,l:"Inseguro"},{v:1,l:"Firme"}] },
  { key:"eq8a",label:"8A. Giro 360° (pasos)",       opts:[{v:0,l:"Discontinuos"},{v:1,l:"Continuos"}] },
  { key:"eq8b",label:"8B. Giro 360° (seguridad)",   opts:[{v:0,l:"Inseguro"},{v:1,l:"Seguro"}] },
  { key:"eq9", label:"9. Sentarse",                 opts:[{v:0,l:"Inseguro/cae"},{v:1,l:"Usa brazos"},{v:2,l:"Suave, seguro"}] },
];

const TINETTI_M = [
  { key:"m1", label:"1. Inicio de la marcha",      opts:[{v:0,l:"Vacilación"},{v:1,l:"Sin vacilación"}] },
  { key:"m2", label:"2. Longitud paso derecho",    opts:[{v:0,l:"No sobrepasa izq."},{v:1,l:"Sobrepasa izq."}] },
  { key:"m3", label:"3. Longitud paso izquierdo",  opts:[{v:0,l:"No sobrepasa der."},{v:1,l:"Sobrepasa der."}] },
  { key:"m4", label:"4. Simetría del paso",        opts:[{v:0,l:"Desigual"},{v:1,l:"Igual"}] },
  { key:"m5", label:"5. Fluidez del paso",         opts:[{v:0,l:"Discontinua"},{v:1,l:"Fluida"}] },
  { key:"m6", label:"6. Trayectoria",              opts:[{v:0,l:"Desviación marcada"},{v:1,l:"Leve o con apoyo"},{v:2,l:"Sin desviación"}] },
  { key:"m7", label:"7. Tronco",                   opts:[{v:0,l:"Balanceo/usa apoyo"},{v:1,l:"Sin balanceo c/flex"},{v:2,l:"Estable sin apoyo"}] },
  { key:"m8", label:"8. Postura en la marcha",     opts:[{v:0,l:"Talones separados"},{v:1,l:"Talones juntos"}] },
];

// ─── Seguimiento rows ─────────────────────────────────────────────────────────
const SEG_ROWS = Array.from({ length: 18 }, (_, i) => i);

// ─── Main Template ────────────────────────────────────────────────────────────
export default function HojaClinicaTemplate({ form, onChange, onRadio, readOnly }) {
  const v = (key) => form[key] || "";
  const inp = (key, style) => readOnly
    ? <span style={{ color: C.text, fontSize: 12, display: "inline-block", minWidth: 20 }}>{v(key)}</span>
    : <input type="text" name={key} value={v(key)} onChange={onChange} style={{ border: "none", borderBottom: `1.5px solid ${C.pinkLight}`, background: "transparent", outline: "none", fontSize: 12, fontFamily: "'Segoe UI', Arial, sans-serif", width: "100%", padding: "2px 4px", ...style }} />;

  const barthelTotal = BARTHEL_ITEMS.reduce((s, i) => s + (Number(form[`barthel_${i.key}`]) || 0), 0);
  const barthelClass =
    barthelTotal < 20 ? "Dependencia Total" :
    barthelTotal <= 35 ? "Dependencia Severa" :
    barthelTotal <= 55 ? "Dependencia Moderada" :
    barthelTotal <= 95 ? "Dependencia Leve" : "Independencia";

  const tinEqTotal = TINETTI_EQ.reduce((s, i) => s + (Number(form[`tinetti_${i.key}`]) || 0), 0);
  const tinMaTotal = TINETTI_M.reduce((s, i) => s + (Number(form[`tinetti_${i.key}`]) || 0), 0);

  // ── PAGE 1 — Historia Clínica ───────────────────────────────────────────────
  const Page1 = (
    <PageWrapper pageNum={1}>
      <SectionPill>Datos del Paciente</SectionPill>
      <FieldRow>
        <Field label="Nombre completo" name="nombre_paciente" value={v("nombre_paciente")} onChange={onChange} readOnly={readOnly} flex={3} />
        <Field label="Fecha" name="fecha" value={v("fecha")} onChange={onChange} readOnly={readOnly} flex={1} />
        <Field label="Sesión #" name="sesion_num" value={v("sesion_num")} onChange={onChange} readOnly={readOnly} flex={0.6} />
      </FieldRow>
      <FieldRow>
        <Field label="Edad" name="edad" value={v("edad")} onChange={onChange} readOnly={readOnly} flex={0.6} />
        <Field label="Fecha de Nacimiento" name="fecha_nacimiento" value={v("fecha_nacimiento")} onChange={onChange} readOnly={readOnly} flex={1} />
        <Field label="Estado Civil" name="estado_civil" value={v("estado_civil")} onChange={onChange} readOnly={readOnly} flex={1} />
        <Field label="Ocupación" name="ocupacion" value={v("ocupacion")} onChange={onChange} readOnly={readOnly} flex={1.5} />
        <Field label="Teléfono" name="telefono" value={v("telefono")} onChange={onChange} readOnly={readOnly} flex={1} />
      </FieldRow>
      <FieldRow>
        <Field label="Domicilio" name="domicilio" value={v("domicilio")} onChange={onChange} readOnly={readOnly} flex={1} />
      </FieldRow>

      <SectionPill>Signos Vitales</SectionPill>
      <FieldRow>
        <Field label="Talla (cm)" name="talla" value={v("talla")} onChange={onChange} readOnly={readOnly} flex={1} />
        <Field label="Peso (kg)" name="peso" value={v("peso")} onChange={onChange} readOnly={readOnly} flex={1} />
        <Field label="IMC" name="imc" value={v("imc")} onChange={onChange} readOnly={readOnly} flex={1} />
        <Field label="SatO₂ (%)" name="sat02" value={v("sat02")} onChange={onChange} readOnly={readOnly} flex={1} />
        <Field label="FC (lpm)" name="fc" value={v("fc")} onChange={onChange} readOnly={readOnly} flex={1} />
        <Field label="TA (mmHg)" name="ta" value={v("ta")} onChange={onChange} readOnly={readOnly} flex={1} />
        <Field label="Temp. (°C)" name="tc" value={v("tc")} onChange={onChange} readOnly={readOnly} flex={1} />
      </FieldRow>

      <SectionPill>Historia Clínica</SectionPill>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 6 }}>
        <TableHeader cols={["AHF — Antecedentes Heredo-Familiares", "APP — Antecedentes Personales Patológicos", "APNP — Antecedentes No Patológicos", "AGO — Antecedentes Gineco-Obstétricos"]} />
        <tbody>
          <tr>
            {["ahf","app","apnp","ago"].map(key => (
              <td key={key} style={{ ...tCell, height: 110, width: "25%" }}>
                {readOnly
                  ? <div style={{ fontSize: 11, whiteSpace: "pre-wrap" }}>{v(key)}</div>
                  : <textarea name={key} value={v(key)} onChange={onChange} style={{ ...tInput, height: 100 }} />
                }
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <SectionPill>Alergias y Medicamentos</SectionPill>
      <FieldRow>
        <Field label="Alergias conocidas" name="alergias" value={v("alergias")} onChange={onChange} readOnly={readOnly} flex={1} multiline rows={2} />
        <Field label="Medicamentos actuales" name="medicamentos" value={v("medicamentos")} onChange={onChange} readOnly={readOnly} flex={1} multiline rows={2} />
      </FieldRow>

      <SectionPill>Motivo de Consulta</SectionPill>
      <Field label="" name="motivo" value={v("motivo")} onChange={onChange} readOnly={readOnly} flex={1} multiline rows={4} />

      <SectionPill>Objetivos y Plan de Tratamiento</SectionPill>
      <Field label="" name="objetivos" value={v("objetivos")} onChange={onChange} readOnly={readOnly} flex={1} multiline rows={4} />

      {/* Footer */}
      <div style={{ marginTop: 12, borderTop: `1px solid ${C.pinkLight}`, paddingTop: 6, fontSize: 9, color: C.gray, textAlign: "center" }}>
        KeiPelvic · Fisioterapia Pelvic · Rehabilitación Neurológica
      </div>
    </PageWrapper>
  );

  // ── PAGE 2 — Notas Interconsulta + Consentimiento ──────────────────────────
  const Page2 = (
    <PageWrapper pageNum={2}>
      <SectionPill>Notas de Interconsulta</SectionPill>
      <Field label="" name="notas_interconsulta" value={v("notas_interconsulta")} onChange={onChange} readOnly={readOnly} multiline rows={8} />

      <SectionPill>Notas SOAP — Seguimiento</SectionPill>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Field label="S — Subjetivo (síntomas, queja principal)" name="soap_s" value={v("soap_s")} onChange={onChange} readOnly={readOnly} multiline rows={4} />
        <Field label="O — Objetivo (hallazgos, mediciones)" name="soap_o" value={v("soap_o")} onChange={onChange} readOnly={readOnly} multiline rows={4} />
        <Field label="A — Análisis (diagnóstico)" name="soap_a" value={v("soap_a")} onChange={onChange} readOnly={readOnly} multiline rows={4} />
        <Field label="P — Plan (tratamiento, próxima sesión)" name="soap_p" value={v("soap_p")} onChange={onChange} readOnly={readOnly} multiline rows={4} />
      </div>

      <SectionPill>Consentimiento Informado</SectionPill>
      <div style={{ background: C.pinkBg, border: `1px solid ${C.pinkLight}`, borderRadius: 6, padding: "10px 14px", fontSize: 10, lineHeight: 1.6, marginBottom: 12, color: C.text }}>
        <p style={{ margin: "0 0 6px" }}>
          Yo, el/la paciente o representante legal, declaro haber sido informado/a de manera clara y comprensible sobre el diagnóstico, procedimientos de fisioterapia, riesgos potenciales y alternativas de tratamiento.
        </p>
        <p style={{ margin: "0 0 6px" }}>
          Autorizo al equipo de <strong style={{ color: C.rose }}>KeiPelvic</strong> a realizar las evaluaciones y técnicas de fisioterapia pélvica y rehabilitación neurológica que sean necesarias para mi tratamiento.
        </p>
        <p style={{ margin: 0 }}>
          Entiendo que tengo el derecho de retirar este consentimiento en cualquier momento sin que ello afecte la calidad de la atención recibida. Confirmo que he leído y comprendido esta información.
        </p>
      </div>

      <FieldRow style={{ marginTop: 20 }}>
        <Field label="Nombre y firma del paciente / representante legal" name="firma_paciente" value={v("firma_paciente")} onChange={onChange} readOnly={readOnly} flex={1.5} />
        <Field label="Fecha" name="fecha_consentimiento" value={v("fecha_consentimiento")} onChange={onChange} readOnly={readOnly} flex={0.8} />
      </FieldRow>

      <div style={{ marginTop: 30, borderTop: `1px solid ${C.pinkLight}`, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 9, color: C.gray }}>
        <div>KeiPelvic · Fisioterapia Pelvic · Rehabilitación Neurológica</div>
        <div>Tel: (55) XXXX-XXXX · contacto@keipelvic.com</div>
      </div>
    </PageWrapper>
  );

  // ── PAGE 3 — Tabla de Seguimiento (parte 1) ────────────────────────────────
  const Page3 = (
    <PageWrapper pageNum={3}>
      <SectionPill>Registro de Sesiones — Seguimiento</SectionPill>
      <p style={{ fontSize: 9, color: C.gray, margin: "2px 0 8px", fontStyle: "italic" }}>
        Registre cada sesión con fecha, número, intervención realizada y firma de conformidad del paciente.
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <TableHeader
          cols={["Fecha", "Ses. #", "Tx e Intervención Terapéutica", "Firma de Conformidad"]}
          colWidths={["12%", "7%", "60%", "21%"]}
        />
        <tbody>
          {SEG_ROWS.slice(0, 12).map((i) => (
            <tr key={i}>
              <td style={{ ...tCell, height: 32 }}>
                {readOnly
                  ? <span style={{ fontSize: 11 }}>{v(`seg_fecha_${i}`)}</span>
                  : <input type="text" name={`seg_fecha_${i}`} value={v(`seg_fecha_${i}`)} onChange={onChange} style={tInput} />
                }
              </td>
              <td style={{ ...tCell, textAlign: "center" }}>
                {readOnly
                  ? <span style={{ fontSize: 11 }}>{v(`seg_sesion_${i}`)}</span>
                  : <input type="text" name={`seg_sesion_${i}`} value={v(`seg_sesion_${i}`)} onChange={onChange} style={{ ...tInput, textAlign: "center" }} />
                }
              </td>
              <td style={tCell}>
                {readOnly
                  ? <span style={{ fontSize: 11, whiteSpace: "pre-wrap" }}>{v(`seg_tx_${i}`)}</span>
                  : <textarea name={`seg_tx_${i}`} value={v(`seg_tx_${i}`)} onChange={onChange} style={{ ...tInput, height: 28 }} />
                }
              </td>
              <td style={tCell}></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 12, borderTop: `1px solid ${C.pinkLight}`, paddingTop: 6, fontSize: 9, color: C.gray, textAlign: "center" }}>
        KeiPelvic · Fisioterapia Pelvic · Rehabilitación Neurológica
      </div>
    </PageWrapper>
  );

  // ── PAGE 4 — Tabla de Seguimiento (parte 2) ────────────────────────────────
  const Page4 = (
    <PageWrapper pageNum={4}>
      <SectionPill>Registro de Sesiones — Continuación</SectionPill>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <TableHeader
          cols={["Fecha", "Ses. #", "Tx e Intervención Terapéutica", "Firma de Conformidad"]}
          colWidths={["12%", "7%", "60%", "21%"]}
        />
        <tbody>
          {SEG_ROWS.slice(0, 12).map((i) => {
            const idx = i + 12;
            return (
              <tr key={idx}>
                <td style={{ ...tCell, height: 32 }}>
                  {readOnly
                    ? <span style={{ fontSize: 11 }}>{v(`seg_fecha_${idx}`)}</span>
                    : <input type="text" name={`seg_fecha_${idx}`} value={v(`seg_fecha_${idx}`)} onChange={onChange} style={tInput} />
                  }
                </td>
                <td style={{ ...tCell, textAlign: "center" }}>
                  {readOnly
                    ? <span style={{ fontSize: 11 }}>{v(`seg_sesion_${idx}`)}</span>
                    : <input type="text" name={`seg_sesion_${idx}`} value={v(`seg_sesion_${idx}`)} onChange={onChange} style={{ ...tInput, textAlign: "center" }} />
                  }
                </td>
                <td style={tCell}>
                  {readOnly
                    ? <span style={{ fontSize: 11, whiteSpace: "pre-wrap" }}>{v(`seg_tx_${idx}`)}</span>
                    : <textarea name={`seg_tx_${idx}`} value={v(`seg_tx_${idx}`)} onChange={onChange} style={{ ...tInput, height: 28 }} />
                  }
                </td>
                <td style={tCell}></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ marginTop: 12, borderTop: `1px solid ${C.pinkLight}`, paddingTop: 6, fontSize: 9, color: C.gray, textAlign: "center" }}>
        KeiPelvic · Fisioterapia Pelvic · Rehabilitación Neurológica
      </div>
    </PageWrapper>
  );

  // ── PAGE 5 — ISNCSCI ──────────────────────────────────────────────────────
  const Page5 = (
    <PageWrapper pageNum={5}>
      <SectionPill>ISNCSCI — Clasificación Neurológica de Lesión Medular</SectionPill>
      <p style={{ fontSize: 9, color: C.gray, margin: "2px 0 10px", fontStyle: "italic" }}>
        International Standards for Neurological Classification of Spinal Cord Injury (ASIA/ISNCSCI)
      </p>

      {/* Motor scores */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.rose, marginBottom: 6, textTransform: "uppercase" }}>Puntajes Motores</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <TableHeader cols={["Extremidad", "Derecho (máx 25)", "Izquierdo (máx 25)"]} colWidths={["30%","35%","35%"]} />
          <tbody>
            {[
              { label: "Extremidad Superior (UE)", r: "uer", l: "uel" },
              { label: "Extremidad Inferior (LE)", r: "ler", l: "lel" },
            ].map(row => (
              <tr key={row.r}>
                <td style={{ ...tCell, fontWeight: 600, color: C.rose, fontSize: 11 }}>{row.label}</td>
                <td style={tCell}>
                  {readOnly ? <span>{v(row.r)}</span> : <input type="number" name={row.r} value={v(row.r)} onChange={onChange} min={0} max={25} style={{ ...tInput, width: 60 }} />}
                </td>
                <td style={tCell}>
                  {readOnly ? <span>{v(row.l)}</span> : <input type="number" name={row.l} value={v(row.l)} onChange={onChange} min={0} max={25} style={{ ...tInput, width: 60 }} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sensory scores */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.rose, marginBottom: 6, textTransform: "uppercase" }}>Puntajes Sensoriales</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <TableHeader cols={["Modalidad", "Derecho (máx 56)", "Izquierdo (máx 56)"]} colWidths={["30%","35%","35%"]} />
          <tbody>
            {[
              { label: "Tacto Ligero (LT)", r: "lte", l: "ltl" },
              { label: "Pinprick / Dolor (PP)", r: "pper", l: "ppel" },
            ].map(row => (
              <tr key={row.r}>
                <td style={{ ...tCell, fontWeight: 600, color: C.rose, fontSize: 11 }}>{row.label}</td>
                <td style={tCell}>
                  {readOnly ? <span>{v(row.r)}</span> : <input type="number" name={row.r} value={v(row.r)} onChange={onChange} min={0} max={56} style={{ ...tInput, width: 60 }} />}
                </td>
                <td style={tCell}>
                  {readOnly ? <span>{v(row.l)}</span> : <input type="number" name={row.l} value={v(row.l)} onChange={onChange} min={0} max={56} style={{ ...tInput, width: 60 }} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Classification */}
      <SectionPill>Clasificación</SectionPill>
      <FieldRow>
        <Field label="NLI — Nivel Neurológico de Lesión" name="nli" value={v("nli")} onChange={onChange} readOnly={readOnly} flex={1} />
        <Field label="Completa / Incompleta" name="complete_incomplete" value={v("complete_incomplete")} onChange={onChange} readOnly={readOnly} flex={1} />
        <Field label="AIS — Escala de Impacto ASIA" name="ais" value={v("ais")} onChange={onChange} readOnly={readOnly} flex={1} />
      </FieldRow>

      <SectionPill>Observaciones ISNCSCI</SectionPill>
      <Field label="" name="isncsci_comments" value={v("isncsci_comments")} onChange={onChange} readOnly={readOnly} multiline rows={4} />

      {/* AIS Reference */}
      <div style={{ marginTop: 12, background: C.pinkBg, border: `1px solid ${C.pinkLight}`, borderRadius: 6, padding: "8px 12px" }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: C.rose, marginBottom: 4 }}>REFERENCIA — Escala ASIA (AIS)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4 }}>
          {[
            { g:"A", d:"Completa — sin función motora/sensitiva en S4-S5" },
            { g:"B", d:"Sensitiva incompleta — función sensitiva bajo NLI incluye S4-S5" },
            { g:"C", d:"Motora incompleta — <50% músculos clave grado ≥3" },
            { g:"D", d:"Motora incompleta — ≥50% músculos clave grado ≥3" },
            { g:"E", d:"Normal — función motora y sensitiva normal" },
          ].map(x => (
            <div key={x.g} style={{ background: C.white, border: `1px solid ${C.pinkLight}`, borderRadius: 4, padding: "4px 6px" }}>
              <div style={{ fontWeight: 900, color: C.rose, fontSize: 13 }}>{x.g}</div>
              <div style={{ fontSize: 8, color: C.text, lineHeight: 1.3 }}>{x.d}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12, borderTop: `1px solid ${C.pinkLight}`, paddingTop: 6, fontSize: 9, color: C.gray, textAlign: "center" }}>
        KeiPelvic · Fisioterapia Pelvic · Rehabilitación Neurológica
      </div>
    </PageWrapper>
  );

  // ── PAGE 6 — Índice de Barthel ─────────────────────────────────────────────
  const Page6 = (
    <PageWrapper pageNum={6}>
      <SectionPill>Índice de Barthel — Actividades de la Vida Diaria</SectionPill>
      <p style={{ fontSize: 9, color: C.gray, margin: "2px 0 10px", fontStyle: "italic" }}>
        Escala de valoración funcional. Puntaje total: 0–100 pts.
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <TableHeader cols={["Actividad", "Opciones de Respuesta", "Pts"]} colWidths={["22%","66%","12%"]} />
        <tbody>
          {BARTHEL_ITEMS.map(item => {
            const key = `barthel_${item.key}`;
            const val = form[key];
            return (
              <tr key={item.key} style={{ borderBottom: `1px solid ${C.pinkLight}` }}>
                <td style={{ ...tCell, fontWeight: 700, color: C.rose, fontSize: 10 }}>{item.label}</td>
                <td style={tCell}>
                  {readOnly
                    ? <span style={{ fontSize: 11 }}>{item.opts.find(o => String(o.v) === String(val))?.l || "—"}</span>
                    : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px" }}>
                        {item.opts.map(opt => (
                          <label key={opt.v} style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer", fontSize: 10 }}>
                            <input type="radio" name={key} value={String(opt.v)} checked={String(val) === String(opt.v)}
                              onChange={() => onRadio(key, String(opt.v))} style={{ accentColor: C.rose }} />
                            <span style={{ color: C.text }}>{opt.v}</span>
                            <span style={{ color: C.gray }}>— {opt.l}</span>
                          </label>
                        ))}
                      </div>
                    )
                  }
                </td>
                <td style={{ ...tCell, textAlign: "center", fontWeight: 700, color: C.rose }}>
                  {val !== "" && val !== undefined ? val : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Total */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, gap: 10, alignItems: "center" }}>
        <div style={{ fontSize: 11, color: C.gray }}>Clasificación:</div>
        <div style={{
          background: C.pinkBg, border: `2px solid ${C.pink}`, borderRadius: 8,
          padding: "6px 20px", fontWeight: 800, color: C.rose, fontSize: 14,
        }}>
          {barthelTotal}/100 — {barthelClass}
        </div>
      </div>

      {/* Reference */}
      <div style={{ marginTop: 10, background: C.pinkBg, border: `1px solid ${C.pinkLight}`, borderRadius: 6, padding: "6px 12px" }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: C.rose, marginBottom: 3 }}>CLASIFICACIÓN DE REFERENCIA</div>
        <div style={{ display: "flex", gap: 12, fontSize: 9, flexWrap: "wrap" }}>
          {[["0–19","Dependencia Total"],["20–35","Dependencia Severa"],["36–55","Dependencia Moderada"],["56–95","Dependencia Leve"],["96–100","Independencia"]].map(([r,l]) => (
            <span key={r}><strong style={{ color: C.rose }}>{r}</strong> {l}</span>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12, borderTop: `1px solid ${C.pinkLight}`, paddingTop: 6, fontSize: 9, color: C.gray, textAlign: "center" }}>
        KeiPelvic · Fisioterapia Pelvic · Rehabilitación Neurológica
      </div>
    </PageWrapper>
  );

  // ── PAGE 7 — Ashworth + Campbell ──────────────────────────────────────────
  const Page7 = (
    <PageWrapper pageNum={7}>
      <SectionPill>Tono Muscular — Escalas de Valoración</SectionPill>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 6 }}>
        {/* Ashworth */}
        <div style={{ border: `1.5px solid ${C.pinkLight}`, borderRadius: 6, padding: "10px 14px" }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: C.rose, marginBottom: 8, borderBottom: `1px solid ${C.pinkLight}`, paddingBottom: 4 }}>
            Escala Modificada de Ashworth
          </div>
          <p style={{ fontSize: 9, color: C.gray, margin: "0 0 8px", fontStyle: "italic" }}>
            Valoración de la espasticidad muscular (hipertonía)
          </p>
          {[
            {v:"0",  l:"Tono muscular normal"},
            {v:"1",  l:"Ligero aumento al doblar/estirar (bloqueo al final)"},
            {v:"1+", l:"Ligero aumento en >mitad del arco articular"},
            {v:"2",  l:"Aumento más pronunciado, mov. pasivo fácil"},
            {v:"3",  l:"Aumento considerable, mov. pasivo difícil"},
            {v:"4",  l:"Afectada en flexión o extensión — rigidez"},
          ].map(opt => (
            <label key={opt.v} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8, cursor: readOnly ? "default" : "pointer" }}>
              <input type="radio" name="ashworth_score" value={opt.v}
                checked={form.ashworth_score === opt.v}
                onChange={readOnly ? undefined : () => onRadio("ashworth_score", opt.v)}
                disabled={readOnly}
                style={{ accentColor: C.rose, marginTop: 2 }}
              />
              <div>
                <span style={{ fontWeight: 700, color: C.rose, marginRight: 4 }}>{opt.v}</span>
                <span style={{ fontSize: 11, color: C.text }}>{opt.l}</span>
              </div>
            </label>
          ))}
        </div>

        {/* Campbell */}
        <div style={{ border: `1.5px solid ${C.pinkLight}`, borderRadius: 6, padding: "10px 14px" }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: C.rose, marginBottom: 8, borderBottom: `1px solid ${C.pinkLight}`, paddingBottom: 4 }}>
            Escala de Campbell
          </div>
          <p style={{ fontSize: 9, color: C.gray, margin: "0 0 8px", fontStyle: "italic" }}>
            Valoración global del tono muscular (hipo/hipertonía)
          </p>
          {[
            {v:"-3", l:"Hipotonía Severa — sin resistencia al mov. pasivo"},
            {v:"-2", l:"Hipotonía Severa — axial y proximal"},
            {v:"-1", l:"Hipotonía Leve"},
            {v:"0",  l:"Tono Normal"},
            {v:"+1", l:"Hipertonía Leve"},
            {v:"+2", l:"Hipertonía Moderada"},
            {v:"+3", l:"Hipertonía Severa"},
          ].map(opt => (
            <label key={opt.v} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8, cursor: readOnly ? "default" : "pointer" }}>
              <input type="radio" name="campbell_score" value={opt.v}
                checked={form.campbell_score === opt.v}
                onChange={readOnly ? undefined : () => onRadio("campbell_score", opt.v)}
                disabled={readOnly}
                style={{ accentColor: C.rose, marginTop: 2 }}
              />
              <div>
                <span style={{ fontWeight: 700, color: C.rose, marginRight: 4 }}>{opt.v}</span>
                <span style={{ fontSize: 11, color: C.text }}>{opt.l}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <SectionPill>Observaciones de Tono Muscular</SectionPill>
      <Field label="" name="tono_notes" value={v("tono_notes")} onChange={onChange} readOnly={readOnly} multiline rows={4} />

      <div style={{ marginTop: 16, borderTop: `1px solid ${C.pinkLight}`, paddingTop: 6, fontSize: 9, color: C.gray, textAlign: "center" }}>
        KeiPelvic · Fisioterapia Pelvic · Rehabilitación Neurológica
      </div>
    </PageWrapper>
  );

  // ── PAGE 8 — Escala de Tinetti ─────────────────────────────────────────────
  const Page8 = (
    <PageWrapper pageNum={8}>
      <SectionPill>Escala de Tinetti — Equilibrio y Marcha</SectionPill>
      <p style={{ fontSize: 9, color: C.gray, margin: "2px 0 8px", fontStyle: "italic" }}>
        Valoración del riesgo de caídas. Total máximo: 28 pts. &lt;19 = alto riesgo de caída.
      </p>

      {/* Equilibrio */}
      <div style={{ fontWeight: 700, fontSize: 11, color: C.rose, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Parte I — Equilibrio (máx 16 pts)
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
        <TableHeader cols={["Ítem", "Criterios de evaluación", "Pts"]} colWidths={["28%","62%","10%"]} />
        <tbody>
          {TINETTI_EQ.map(item => {
            const key = `tinetti_${item.key}`;
            const val = form[key];
            return (
              <tr key={item.key} style={{ borderBottom: `1px solid ${C.pinkLight}` }}>
                <td style={{ ...tCell, fontWeight: 600, color: C.rose, fontSize: 10 }}>{item.label}</td>
                <td style={tCell}>
                  {readOnly
                    ? <span style={{ fontSize: 11 }}>{item.opts.find(o => String(o.v) === String(val))?.l || "—"}</span>
                    : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px" }}>
                        {item.opts.map(opt => (
                          <label key={opt.v} style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer", fontSize: 10 }}>
                            <input type="radio" name={key} value={String(opt.v)} checked={String(val) === String(opt.v)}
                              onChange={() => onRadio(key, String(opt.v))} style={{ accentColor: C.rose }} />
                            <span style={{ color: C.text }}>{opt.v}</span>
                            <span style={{ color: C.gray }}>— {opt.l}</span>
                          </label>
                        ))}
                      </div>
                    )
                  }
                </td>
                <td style={{ ...tCell, textAlign: "center", fontWeight: 700, color: C.rose }}>
                  {val !== "" && val !== undefined ? val : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <div style={{ background: tinEqTotal < 10 ? "#ffebee" : C.pinkBg, border: `2px solid ${tinEqTotal < 10 ? "#e53935" : C.pink}`, borderRadius: 8, padding: "5px 18px", fontWeight: 800, color: tinEqTotal < 10 ? "#b71c1c" : C.rose }}>
          Subtotal Equilibrio: {tinEqTotal}/16 {tinEqTotal < 10 ? "⚠ Alto riesgo" : ""}
        </div>
      </div>

      {/* Marcha */}
      <div style={{ fontWeight: 700, fontSize: 11, color: C.rose, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Parte II — Marcha (máx 12 pts)
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
        <TableHeader cols={["Ítem", "Criterios de evaluación", "Pts"]} colWidths={["28%","62%","10%"]} />
        <tbody>
          {TINETTI_M.map(item => {
            const key = `tinetti_${item.key}`;
            const val = form[key];
            return (
              <tr key={item.key} style={{ borderBottom: `1px solid ${C.pinkLight}` }}>
                <td style={{ ...tCell, fontWeight: 600, color: C.rose, fontSize: 10 }}>{item.label}</td>
                <td style={tCell}>
                  {readOnly
                    ? <span style={{ fontSize: 11 }}>{item.opts.find(o => String(o.v) === String(val))?.l || "—"}</span>
                    : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px" }}>
                        {item.opts.map(opt => (
                          <label key={opt.v} style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer", fontSize: 10 }}>
                            <input type="radio" name={key} value={String(opt.v)} checked={String(val) === String(opt.v)}
                              onChange={() => onRadio(key, String(opt.v))} style={{ accentColor: C.rose }} />
                            <span style={{ color: C.text }}>{opt.v}</span>
                            <span style={{ color: C.gray }}>— {opt.l}</span>
                          </label>
                        ))}
                      </div>
                    )
                  }
                </td>
                <td style={{ ...tCell, textAlign: "center", fontWeight: 700, color: C.rose }}>
                  {val !== "" && val !== undefined ? val : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ background: C.pinkBg, border: `2px solid ${C.pink}`, borderRadius: 8, padding: "5px 18px", fontWeight: 700, color: C.rose }}>
          Marcha: {tinMaTotal}/12
        </div>
        <div style={{
          background: (tinEqTotal + tinMaTotal) < 19 ? "#b71c1c" : C.rose,
          borderRadius: 8, padding: "5px 18px", fontWeight: 800, color: "#fff", fontSize: 14,
        }}>
          Total Tinetti: {tinEqTotal + tinMaTotal}/28
          {(tinEqTotal + tinMaTotal) < 19 ? " — ⚠ ALTO RIESGO" : ""}
        </div>
      </div>

      <SectionPill>Observaciones Tinetti</SectionPill>
      <Field label="" name="tinetti_notes" value={v("tinetti_notes")} onChange={onChange} readOnly={readOnly} multiline rows={3} />

      <div style={{ marginTop: 12, borderTop: `1px solid ${C.pinkLight}`, paddingTop: 6, fontSize: 9, color: C.gray, textAlign: "center" }}>
        KeiPelvic · Fisioterapia Pelvic · Rehabilitación Neurológica
      </div>
    </PageWrapper>
  );

  return (
    <div id="hoja-print">
      {Page1}
      {Page2}
      {Page3}
      {Page4}
      {Page5}
      {Page6}
      {Page7}
      {Page8}
    </div>
  );
}

// ─── Default form initial state (export for use in parent) ────────────────────
export const INITIAL_FORM = {
  nombre_paciente: "", fecha: new Date().toLocaleDateString("es-MX"), sesion_num: "",
  edad: "", fecha_nacimiento: "", estado_civil: "", ocupacion: "", telefono: "", domicilio: "",
  talla: "", peso: "", imc: "", sat02: "",
  fc: "", ta: "", tc: "",
  ahf: "", app: "", apnp: "", ago: "",
  alergias: "", medicamentos: "",
  motivo: "", objetivos: "",
  notas_interconsulta: "",
  firma_paciente: "", fecha_consentimiento: "",
  soap_s: "", soap_o: "", soap_a: "", soap_p: "",
  isncsci_comments: "",
  uer: "", uel: "", ler: "", lel: "",
  lte: "", ltl: "", pper: "", ppel: "",
  nli: "", complete_incomplete: "", ais: "",
  ashworth_score: "", campbell_score: "", tono_notes: "",
  tinetti_notes: "",
  ...Object.fromEntries(BARTHEL_ITEMS.map(i => [`barthel_${i.key}`, ""])),
  ...Object.fromEntries(TINETTI_EQ.map(i => [`tinetti_${i.key}`, ""])),
  ...Object.fromEntries(TINETTI_M.map(i => [`tinetti_${i.key}`, ""])),
  ...Object.fromEntries(Array.from({length: 24}, (_, i) => [
    [`seg_fecha_${i}`, ""], [`seg_sesion_${i}`, ""], [`seg_tx_${i}`, ""],
  ]).flat()),
};
