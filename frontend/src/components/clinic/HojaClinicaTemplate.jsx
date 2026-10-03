/**
 * HojaClinicaTemplate.jsx
 * PDF-overlay approach with PIXEL-PRECISE field positions.
 * Coordinates measured via OpenCV from the actual PDF (3x render).
 * Pages 1-4: PDF background + transparent overlay inputs on detected lines.
 * Pages 5-8: PDF images (reference / scoring scales).
 * After PDF pages: interactive CSS scoring (Barthel, Ashworth, Tinetti).
 */
import React, { useRef, useState, useEffect, useCallback } from "react";

// ─── Cloudinary PDF page images ───────────────────────────────────────────────
const PDF_PAGES = [
  "https://res.cloudinary.com/dfzelstrw/image/upload/v1776571295/clinica/hoja_neurologica_p1.png",
  "https://res.cloudinary.com/dfzelstrw/image/upload/v1776571297/clinica/hoja_neurologica_p2.png",
  "https://res.cloudinary.com/dfzelstrw/image/upload/v1776571299/clinica/hoja_neurologica_p3.png",
  "https://res.cloudinary.com/dfzelstrw/image/upload/v1776571301/clinica/hoja_neurologica_p4.png",
  "https://res.cloudinary.com/dfzelstrw/image/upload/v1776571304/clinica/hoja_neurologica_p5.png",
  "https://res.cloudinary.com/dfzelstrw/image/upload/v1776571309/clinica/hoja_neurologica_p6.png",
  "https://res.cloudinary.com/dfzelstrw/image/upload/v1776571312/clinica/hoja_neurologica_p7.png",
  "https://res.cloudinary.com/dfzelstrw/image/upload/v1776571315/clinica/hoja_neurologica_p8.png",
];

// Image aspect ratio: 1530 × 1980 px → height = 129.41% of width
const ASPECT = 1980 / 1530;

// ─── Field maps: {key, l, t, w, h?, multi?} all in % of page dimensions ─────
// l = left%, t = top% (of image), w = width%, h = height% (default 2.3%)
// Measured from OpenCV-detected lines on PDF render.

// Page 1 — Historia Clínica Principal
const P1_FIELDS = [
  { key: "nombre_paciente",  l: 28.5, t: 10.0, w: 60.8 },
  { key: "edad",             l: 14.9, t: 12.5, w:  7.6 },
  { key: "fecha_nacimiento", l: 43.0, t: 12.5, w: 18.0 },
  { key: "estado_civil",     l: 70.2, t: 12.5, w: 19.8 },
  { key: "ocupacion",        l: 19.9, t: 15.0, w: 40.8 },
  { key: "telefono",         l: 70.0, t: 15.0, w: 20.0 },
  { key: "domicilio",        l: 18.6, t: 17.5, w: 71.3 },
  { key: "talla",            l: 14.7, t: 20.0, w: 11.0 },
  { key: "peso",             l: 31.6, t: 20.0, w: 11.0 },
  { key: "imc",              l: 47.5, t: 20.0, w: 16.3 },
  { key: "sat02",            l: 71.2, t: 20.0, w: 14.5 },
  { key: "fc",               l: 12.9, t: 29.8, w: 27.0 },
  { key: "ta",               l: 44.3, t: 29.8, w: 21.8 },
  { key: "tc",               l: 69.2, t: 29.8, w: 21.0 },
  // Historia Clínica 4-column table (AHF, APP, APNP, AGO)
  { key: "ahf",              l: 10.4, t: 43.0, w: 15.8, h: 12.8, multi: true },
  { key: "app",              l: 30.5, t: 43.0, w: 15.8, h: 12.8, multi: true },
  { key: "apnp",             l: 50.7, t: 43.0, w: 15.8, h: 12.8, multi: true },
  { key: "ago",              l: 72.2, t: 43.0, w: 15.8, h: 12.8, multi: true },
  // Alergias / Medicamentos
  { key: "alergias",         l: 10.2, t: 58.5, w: 31.0, h: 4.5, multi: true },
  { key: "medicamentos",     l: 46.4, t: 58.5, w: 41.6, h: 4.5, multi: true },
  // Motivo de Consulta
  { key: "motivo",           l: 10.4, t: 70.8, w: 79.8, h: 9.0, multi: true },
  // Objetivos y Plan
  { key: "objetivos",        l: 10.4, t: 88.5, w: 79.8, h: 6.8, multi: true },
];

// Page 2 — Notas Interconsulta + Consentimiento
const P2_FIELDS = [
  { key: "notas_interconsulta", l: 9.7, t: 15.5, w: 78.3, h: 13.0, multi: true },
  { key: "firma_paciente",      l: 9.3, t: 48.8, w: 80.0 },
];

// Pages 3-4 — Seguimiento (rows 1-10) + SOAP
// Row tops: after detected horizontal separator lines
const P3_FIELDS = [
  { key: "seg_fecha_0", l:  8.7, t: 21.8, w: 11.5, h: 12.5, multi: true },
  { key: "seg_tx_0",   l: 20.5, t: 21.8, w: 52.5, h: 12.5, multi: true },
  { key: "seg_fecha_1", l:  8.7, t: 35.7, w: 11.5, h: 12.5, multi: true },
  { key: "seg_tx_1",   l: 20.5, t: 35.7, w: 52.5, h: 12.5, multi: true },
  { key: "seg_fecha_2", l:  8.7, t: 49.7, w: 11.5, h: 12.5, multi: true },
  { key: "seg_tx_2",   l: 20.5, t: 49.7, w: 52.5, h: 12.5, multi: true },
  { key: "seg_fecha_3", l:  8.7, t: 63.6, w: 11.5, h: 12.5, multi: true },
  { key: "seg_tx_3",   l: 20.5, t: 63.6, w: 52.5, h: 12.5, multi: true },
  { key: "seg_fecha_4", l:  8.7, t: 77.5, w: 11.5, h: 10.5, multi: true },
  { key: "seg_tx_4",   l: 20.5, t: 77.5, w: 52.5, h: 10.5, multi: true },
];

const P4_FIELDS = [
  { key: "seg_fecha_5", l:  8.7, t: 11.4, w: 11.5, h: 13.5, multi: true },
  { key: "seg_tx_5",   l: 20.5, t: 11.4, w: 52.5, h: 13.5, multi: true },
  { key: "seg_fecha_6", l:  8.7, t: 26.1, w: 11.5, h: 12.5, multi: true },
  { key: "seg_tx_6",   l: 20.5, t: 26.1, w: 52.5, h: 12.5, multi: true },
  { key: "seg_fecha_7", l:  8.7, t: 40.0, w: 11.5, h: 12.5, multi: true },
  { key: "seg_tx_7",   l: 20.5, t: 40.0, w: 52.5, h: 12.5, multi: true },
  { key: "seg_fecha_8", l:  8.7, t: 54.0, w: 11.5, h: 12.5, multi: true },
  { key: "seg_tx_8",   l: 20.5, t: 54.0, w: 52.5, h: 12.5, multi: true },
  { key: "seg_fecha_9", l:  8.7, t: 67.9, w: 11.5, h: 10.8, multi: true },
  { key: "seg_tx_9",   l: 20.5, t: 67.9, w: 52.5, h: 10.8, multi: true },
  // Notas SOAP (part of page 4)
  { key: "soap_s",     l: 10.9, t: 84.5, w: 81.5, h: 10.1, multi: true },
];

// Page 5 — ISNCSCI (text fields only; scoring grid is visual reference)
const P5_FIELDS = [
  { key: "isncsci_patient_name", l: 23.3, t: 13.9, w: 33.0 },
  { key: "isncsci_date",         l: 75.7, t: 13.9, w: 14.7 },
  { key: "isncsci_examiner",     l: 24.9, t: 16.4, w: 34.8 },
  { key: "isncsci_comments",     l: 10.9, t: 83.0, w: 81.5, h: 11.5, multi: true },
];

// Pages 6-8 → reference images only (no overlay inputs)

// ─── Barthel / Tinetti / Ashworth data ───────────────────────────────────────
const BARTHEL_ITEMS = [
  { key: "comida",        label: "Comer",                   opts: [{v:0,l:"Incapaz"},{v:5,l:"Necesita ayuda"},{v:10,l:"Independiente"}] },
  { key: "traslado",      label: "Trasladarse silla-cama",  opts: [{v:0,l:"Incapaz"},{v:5,l:"Gran ayuda"},{v:10,l:"Poca ayuda"},{v:15,l:"Independiente"}] },
  { key: "aseo",          label: "Aseo personal",           opts: [{v:0,l:"Necesita ayuda"},{v:5,l:"Independiente"}] },
  { key: "retrete",       label: "Uso del retrete",         opts: [{v:0,l:"Dependiente"},{v:5,l:"Necesita ayuda"},{v:10,l:"Independiente"}] },
  { key: "banio",         label: "Bañarse",                 opts: [{v:0,l:"Dependiente"},{v:5,l:"Independiente"}] },
  { key: "desplazamiento",label: "Desplazarse",             opts: [{v:0,l:"Inmóvil"},{v:5,l:"Silla de ruedas"},{v:10,l:"Con ayuda"},{v:15,l:"Independiente"}] },
  { key: "escaleras",     label: "Subir/bajar escaleras",   opts: [{v:0,l:"Incapaz"},{v:5,l:"Necesita ayuda"},{v:10,l:"Independiente"}] },
  { key: "vestido",       label: "Vestirse",                opts: [{v:0,l:"Dependiente"},{v:5,l:"Necesita ayuda"},{v:10,l:"Independiente"}] },
  { key: "deposicion",    label: "Control de heces",        opts: [{v:0,l:"Incontinente"},{v:5,l:"Accidente ocasional"},{v:10,l:"Continente"}] },
  { key: "orina",         label: "Control de orina",        opts: [{v:0,l:"Incontinente"},{v:5,l:"Accidente ocasional"},{v:10,l:"Continente"}] },
];

const TINETTI_EQ = [
  { key:"eq1", label:"1. Equilibrio sentado",        opts:[{v:0,l:"Se inclina/desliza"},{v:1,l:"Firme, seguro"}] },
  { key:"eq2", label:"2. Incorporación",             opts:[{v:0,l:"Incapaz sin ayuda"},{v:1,l:"Usa brazos"},{v:2,l:"Sin usar brazos"}] },
  { key:"eq3", label:"3. Intento de incorporación",  opts:[{v:0,l:"Incapaz"},{v:1,l:">1 intento"},{v:2,l:"1er intento"}] },
  { key:"eq4", label:"4. Equilibrio al levantarse",  opts:[{v:0,l:"Inseguro"},{v:1,l:"Con bastón/apoyo"},{v:2,l:"Sin apoyo"}] },
  { key:"eq5", label:"5. Bipedestación",             opts:[{v:0,l:"Inseguro"},{v:1,l:"Con bastón <8cm"},{v:2,l:"Sin apoyo"}] },
  { key:"eq6", label:"6. Recibe empujón",            opts:[{v:0,l:"Cae"},{v:1,l:"Tambalea"},{v:2,l:"Firme"}] },
  { key:"eq7", label:"7. Ojos cerrados",             opts:[{v:0,l:"Inseguro"},{v:1,l:"Firme"}] },
  { key:"eq8a",label:"8A. Giro 360° (pasos)",        opts:[{v:0,l:"Discontinuos"},{v:1,l:"Continuos"}] },
  { key:"eq8b",label:"8B. Giro 360° (seguridad)",    opts:[{v:0,l:"Inseguro"},{v:1,l:"Seguro"}] },
  { key:"eq9", label:"9. Sentarse",                  opts:[{v:0,l:"Inseguro/cae"},{v:1,l:"Usa brazos"},{v:2,l:"Suave, seguro"}] },
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

// ─── Print CSS ────────────────────────────────────────────────────────────────
export const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #hoja-print, #hoja-print * { visibility: visible !important; }
  #hoja-print { position: fixed; left:0; top:0; width:100%; }
  .no-print { display: none !important; }
  .hoja-page-break { page-break-after: always; break-after: page; }
  .hoja-page-break:last-child { page-break-after: avoid; }
}
@page { size: letter portrait; margin: 0; }
`;

// ─── Default form state ───────────────────────────────────────────────────────
export const INITIAL_FORM = {
  nombre_paciente: "", edad: "", fecha_nacimiento: "", estado_civil: "",
  ocupacion: "", telefono: "", domicilio: "",
  talla: "", peso: "", imc: "", sat02: "", fc: "", ta: "", tc: "",
  ahf: "", app: "", apnp: "", ago: "",
  alergias: "", medicamentos: "",
  motivo: "", objetivos: "",
  notas_interconsulta: "",
  firma_paciente: "",
  // seguimiento rows 0-9
  ...Object.fromEntries(
    Array.from({length: 10}, (_, i) => [
      [`seg_fecha_${i}`, ""], [`seg_tx_${i}`, ""],
    ]).flat()
  ),
  soap_s: "",
  // ISNCSCI
  isncsci_patient_name: "", isncsci_date: "", isncsci_examiner: "", isncsci_comments: "",
  // Barthel
  ...Object.fromEntries(BARTHEL_ITEMS.map(i => [`barthel_${i.key}`, ""])),
  // Tinetti
  ...Object.fromEntries([...TINETTI_EQ, ...TINETTI_M].map(i => [`tinetti_${i.key}`, ""])),
  // Ashworth / Campbell
  ashworth_score: "", campbell_score: "", tono_notes: "",
  tinetti_notes: "",
};

// ─── Styled helpers ───────────────────────────────────────────────────────────
const C = {
  rose:     "#c0005a",
  pink:     "#f48fb1",
  pinkBg:   "#fce4ec",
  pinkLight:"#f8bbd0",
  text:     "#1a1a1a",
  gray:     "#757575",
};

function ScorePill({ label, children }) {
  return (
    <div style={{ background: C.pinkBg, border: `1.5px solid ${C.pink}`, borderRadius: 20,
      padding: "2px 14px", fontWeight: 700, fontSize: 10, color: C.rose,
      textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6, marginTop: 10,
      display: "inline-block" }}>
      {label}{children}
    </div>
  );
}

// ─── PDF overlay page ─────────────────────────────────────────────────────────
function PdfPage({ idx, form, onChange, onRadio, readOnly, fields }) {
  const containerRef = useRef(null);
  const [fs, setFs] = useState(12); // font-size in px, scaled to container

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.offsetWidth;
      // At reference width 816px, font is 12px → 12/816 = 1.47%
      setFs(Math.max(9, Math.min(15, w * 0.0147)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const imgH = `${ASPECT * 100}%`; // paddingTop for aspect-ratio trick

  return (
    <div
      ref={containerRef}
      className="hoja-page-break"
      style={{ position: "relative", width: "100%", marginBottom: 24,
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)", borderRadius: 4, overflow: "hidden" }}
    >
      {/* Aspect-ratio spacer */}
      <div style={{ paddingTop: imgH }} />

      {/* PDF image as background */}
      <img
        src={PDF_PAGES[idx]}
        alt={`Hoja clínica página ${idx + 1}`}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", display: "block" }}
        loading="lazy"
      />

      {/* Transparent inputs overlaid on PDF lines */}
      <div style={{ position: "absolute", inset: 0 }}>
        {(fields || []).map(f => {
          const isMulti = !!f.multi;
          const heightPct = f.h || 2.3;
          const style = {
            position: "absolute",
            left: `${f.l}%`,
            top: `${f.t}%`,
            width: `${f.w}%`,
            height: `${heightPct}%`,
            background: "transparent",
            border: "none",
            outline: "none",
            padding: "1px 3px",
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontSize: fs,
            color: readOnly ? "#444" : "#1a1a1a",
            resize: "none",
            overflow: "hidden",
            lineHeight: 1.35,
            boxSizing: "border-box",
          };

          if (isMulti) {
            return (
              <textarea
                key={f.key}
                name={f.key}
                value={form[f.key] || ""}
                onChange={onChange}
                readOnly={readOnly}
                style={style}
              />
            );
          }
          return (
            <input
              key={f.key}
              type="text"
              name={f.key}
              value={form[f.key] || ""}
              onChange={onChange}
              readOnly={readOnly}
              style={style}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Reference-only PDF page (no inputs) ─────────────────────────────────────
function PdfRef({ idx }) {
  return (
    <div className="hoja-page-break"
      style={{ position: "relative", width: "100%", marginBottom: 24,
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ paddingTop: `${ASPECT * 100}%` }} />
      <img
        src={PDF_PAGES[idx]}
        alt={`Hoja clínica página ${idx + 1}`}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill" }}
        loading="lazy"
      />
    </div>
  );
}

// ─── CSS scoring section (Barthel, Ashworth, Tinetti) ────────────────────────
function ScoringSection({ form, onRadio, readOnly }) {
  const tCell = { border: `1px solid ${C.pinkLight}`, padding: "4px 8px", verticalAlign: "top" };
  const th = { ...tCell, background: C.pinkBg, color: C.rose, fontWeight: 700, fontSize: 10, textTransform: "uppercase" };

  const barthelTotal = BARTHEL_ITEMS.reduce((s, i) => s + (Number(form[`barthel_${i.key}`]) || 0), 0);
  const barthelClass = barthelTotal < 20 ? "Dependencia Total"
    : barthelTotal <= 35 ? "Dependencia Severa"
    : barthelTotal <= 55 ? "Dependencia Moderada"
    : barthelTotal <= 95 ? "Dependencia Leve" : "Independencia";
  const tinEq = TINETTI_EQ.reduce((s, i) => s + (Number(form[`tinetti_${i.key}`]) || 0), 0);
  const tinMa = TINETTI_M.reduce((s, i) => s + (Number(form[`tinetti_${i.key}`]) || 0), 0);

  const radioRow = (item, prefix) => {
    const key = `${prefix}_${item.key}`;
    const val = form[key];
    return (
      <tr key={item.key}>
        <td style={{ ...tCell, fontWeight: 600, color: C.rose, fontSize: 11 }}>{item.label}</td>
        <td style={tCell}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px" }}>
            {item.opts.map(opt => (
              <label key={opt.v} style={{ display: "flex", alignItems: "center", gap: 3, cursor: readOnly ? "default" : "pointer", fontSize: 11 }}>
                <input type="radio" name={key} value={String(opt.v)} checked={String(val) === String(opt.v)}
                  onChange={readOnly ? undefined : () => onRadio(key, String(opt.v))}
                  disabled={readOnly} style={{ accentColor: C.rose }} />
                <span style={{ color: "#333" }}>{opt.v}</span>
                <span style={{ color: C.gray }}> — {opt.l}</span>
              </label>
            ))}
          </div>
        </td>
        <td style={{ ...tCell, textAlign: "center", fontWeight: 700, color: C.rose, minWidth: 32 }}>
          {val !== "" && val !== undefined ? val : "—"}
        </td>
      </tr>
    );
  };

  return (
    <div style={{ background: "#fff", border: `2px solid ${C.pink}`, borderRadius: 8,
      padding: "20px 24px", marginBottom: 24, fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 12 }}>

      {/* ── Barthel ── */}
      <ScorePill label="Índice de Barthel — Actividades de la Vida Diaria" />
      <p style={{ fontSize: 9, color: C.gray, margin: "2px 0 10px", fontStyle: "italic" }}>
        Escala de valoración funcional. Puntaje total: 0–100 pts.
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 10 }}>
        <thead><tr><th style={th}>Actividad</th><th style={th}>Opciones</th><th style={{ ...th, width: 40 }}>Pts</th></tr></thead>
        <tbody>{BARTHEL_ITEMS.map(i => radioRow(i, "barthel"))}</tbody>
      </table>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <div style={{ background: C.pinkBg, border: `2px solid ${C.pink}`, borderRadius: 8,
          padding: "6px 20px", fontWeight: 800, color: C.rose, fontSize: 14 }}>
          Total Barthel: {barthelTotal}/100 — {barthelClass}
        </div>
      </div>

      {/* ── Ashworth + Campbell ── */}
      <ScorePill label="Tono Muscular — Ashworth / Campbell" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8, marginBottom: 16 }}>
        {/* Ashworth */}
        <div style={{ border: `1.5px solid ${C.pinkLight}`, borderRadius: 6, padding: "10px 14px" }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: C.rose, marginBottom: 6 }}>Escala Modificada de Ashworth</div>
          {[{v:"0",l:"Tono normal"},{v:"1",l:"Ligero aumento (final del arco)"},{v:"1+",l:"Ligero aumento >mitad del arco"},{v:"2",l:"Aumento pronunciado, mov. fácil"},{v:"3",l:"Aumento considerable, mov. difícil"},{v:"4",l:"Rigidez total"}].map(o => (
            <label key={o.v} style={{ display: "flex", gap: 6, marginBottom: 6, cursor: readOnly ? "default" : "pointer" }}>
              <input type="radio" name="ashworth_score" value={o.v}
                checked={form.ashworth_score === o.v}
                onChange={readOnly ? undefined : () => onRadio("ashworth_score", o.v)}
                disabled={readOnly} style={{ accentColor: C.rose, marginTop: 2 }} />
              <div><span style={{ fontWeight: 700, color: C.rose, marginRight: 4 }}>{o.v}</span><span style={{ fontSize: 11 }}>{o.l}</span></div>
            </label>
          ))}
        </div>
        {/* Campbell */}
        <div style={{ border: `1.5px solid ${C.pinkLight}`, borderRadius: 6, padding: "10px 14px" }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: C.rose, marginBottom: 6 }}>Escala de Campbell</div>
          {[{v:"-3",l:"Hipotonía Severa"},{v:"-2",l:"Hipotonía Severa axial/proximal"},{v:"-1",l:"Hipotonía Leve"},{v:"0",l:"Tono Normal"},{v:"+1",l:"Hipertonía Leve"},{v:"+2",l:"Hipertonía Moderada"},{v:"+3",l:"Hipertonía Severa"}].map(o => (
            <label key={o.v} style={{ display: "flex", gap: 6, marginBottom: 6, cursor: readOnly ? "default" : "pointer" }}>
              <input type="radio" name="campbell_score" value={o.v}
                checked={form.campbell_score === o.v}
                onChange={readOnly ? undefined : () => onRadio("campbell_score", o.v)}
                disabled={readOnly} style={{ accentColor: C.rose, marginTop: 2 }} />
              <div><span style={{ fontWeight: 700, color: C.rose, marginRight: 4 }}>{o.v}</span><span style={{ fontSize: 11 }}>{o.l}</span></div>
            </label>
          ))}
        </div>
      </div>

      {/* ── Tinetti ── */}
      <ScorePill label="Escala de Tinetti — Equilibrio y Marcha" />
      <p style={{ fontSize: 9, color: C.gray, margin: "2px 0 8px", fontStyle: "italic" }}>
        Total máximo: 28 pts. &lt;19 = alto riesgo de caída.
      </p>
      <div style={{ fontWeight: 700, color: C.rose, fontSize: 11, marginBottom: 4 }}>Equilibrio (máx 16)</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 8 }}>
        <thead><tr><th style={th}>Ítem</th><th style={th}>Criterios</th><th style={{ ...th, width: 40 }}>Pts</th></tr></thead>
        <tbody>{TINETTI_EQ.map(i => radioRow(i, "tinetti"))}</tbody>
      </table>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <div style={{ background: tinEq < 10 ? "#ffebee" : C.pinkBg, border: `2px solid ${tinEq < 10 ? "#e53935" : C.pink}`,
          borderRadius: 8, padding: "5px 18px", fontWeight: 700, color: tinEq < 10 ? "#b71c1c" : C.rose }}>
          Subtotal Equilibrio: {tinEq}/16{tinEq < 10 ? " ⚠ Alto riesgo" : ""}
        </div>
      </div>
      <div style={{ fontWeight: 700, color: C.rose, fontSize: 11, marginBottom: 4 }}>Marcha (máx 12)</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 8 }}>
        <thead><tr><th style={th}>Ítem</th><th style={th}>Criterios</th><th style={{ ...th, width: 40 }}>Pts</th></tr></thead>
        <tbody>{TINETTI_M.map(i => radioRow(i, "tinetti"))}</tbody>
      </table>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <div style={{ background: C.pinkBg, border: `2px solid ${C.pink}`, borderRadius: 8, padding: "5px 18px", fontWeight: 700, color: C.rose }}>
          Marcha: {tinMa}/12
        </div>
        <div style={{ background: (tinEq + tinMa) < 19 ? "#b71c1c" : C.rose, borderRadius: 8,
          padding: "5px 18px", fontWeight: 800, color: "#fff", fontSize: 14 }}>
          Total Tinetti: {tinEq + tinMa}/28{(tinEq + tinMa) < 19 ? " — ⚠ ALTO RIESGO" : ""}
        </div>
      </div>
    </div>
  );
}

// ─── Main Template ────────────────────────────────────────────────────────────
export default function HojaClinicaTemplate({ form, onChange, onRadio, readOnly }) {
  return (
    <div id="hoja-print">
      {/* Pages 1-2: PDF + overlay inputs */}
      <PdfPage idx={0} form={form} onChange={onChange} onRadio={onRadio} readOnly={readOnly} fields={P1_FIELDS} />
      <PdfPage idx={1} form={form} onChange={onChange} onRadio={onRadio} readOnly={readOnly} fields={P2_FIELDS} />
      {/* Pages 3-4: Seguimiento + SOAP */}
      <PdfPage idx={2} form={form} onChange={onChange} onRadio={onRadio} readOnly={readOnly} fields={P3_FIELDS} />
      <PdfPage idx={3} form={form} onChange={onChange} onRadio={onRadio} readOnly={readOnly} fields={P4_FIELDS} />
      {/* Page 5: ISNCSCI — text fields + reference diagram */}
      <PdfPage idx={4} form={form} onChange={onChange} onRadio={onRadio} readOnly={readOnly} fields={P5_FIELDS} />
      {/* Pages 6-8: Reference images (Barthel table, Ashworth, Tinetti scoring guide) */}
      <PdfRef idx={5} />
      <PdfRef idx={6} />
      <PdfRef idx={7} />
      {/* Interactive scoring section (Barthel, Ashworth, Tinetti) */}
      <ScoringSection form={form} onRadio={onRadio} readOnly={readOnly} />
    </div>
  );
}
