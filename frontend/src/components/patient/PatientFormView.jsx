import React, { useState, useEffect } from "react";
import { useParams, useOutletContext, useNavigate } from "react-router-dom";
import { Box, CircularProgress, Button, Typography } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const CLINIC_API = import.meta.env.VITE_CLINIC_API_URL || "";

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
const ASPECT = "129.41%";

// ─── Page 1 field overlay positions ──────────────────────────────────────────
const P1_FIELDS = [
  { key: "nombre_paciente", l: 21,   t: 9.2,  w: 73   },
  { key: "edad",            l: 9,    t: 12,   w: 12   },
  { key: "fecha_nacimiento",l: 40,   t: 12,   w: 17   },
  { key: "estado_civil",    l: 67,   t: 12,   w: 27   },
  { key: "ocupacion",       l: 12,   t: 14.5, w: 46   },
  { key: "telefono",        l: 67,   t: 14.5, w: 27   },
  { key: "domicilio",       l: 12,   t: 17,   w: 82   },
  { key: "talla",           l: 8,    t: 19.5, w: 11   },
  { key: "peso",            l: 23,   t: 19.5, w: 10   },
  { key: "imc",             l: 38,   t: 19.5, w: 18   },
  { key: "sat02",           l: 64,   t: 19.5, w: 30   },
  { key: "fc",              l: 5,    t: 26.5, w: 27   },
  { key: "ta",              l: 38,   t: 26.5, w: 21   },
  { key: "tc",              l: 64,   t: 26.5, w: 30   },
  { key: "ahf",             l: 5,    t: 34.8, w: 17.5, h: 18.5 },
  { key: "app",             l: 23.5, t: 34.8, w: 22.5, h: 18.5 },
  { key: "apnp",            l: 47,   t: 34.8, w: 21.5, h: 18.5 },
  { key: "ago",             l: 70,   t: 34.8, w: 23,   h: 18.5 },
  { key: "alergias",        l: 12,   t: 54.5, w: 32,   h: 4.5  },
  { key: "medicamentos",    l: 58,   t: 54.5, w: 35,   h: 4.5  },
  { key: "motivo",          l: 5,    t: 65,   w: 88,   h: 10.5 },
  { key: "objetivos",       l: 5,    t: 82,   w: 88,   h: 8.5  },
];

const P2_FIELDS = [
  { key: "notas_interconsulta", l: 5,  t: 13.5, w: 88, h: 19 },
  { key: "firma_paciente",      l: 17, t: 60,   w: 65         },
];

// ─── Print styles ─────────────────────────────────────────────────────────────
const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #pfv-print, #pfv-print * { visibility: visible !important; }
  #pfv-print { position: absolute; left: 0; top: 0; width: 100%; }
  .no-print { display: none !important; }
}
@page { size: letter portrait; margin: 0; }
`;

// ─── Read-only PDF Page with overlaid values ───────────────────────────────────
function PdfPage({ url, fields = [], data }) {
  return (
    <div style={{
      position: "relative",
      width: "100%",
      paddingTop: ASPECT,
      marginBottom: 20,
      boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
      borderRadius: 4,
      overflow: "hidden",
      pageBreakAfter: "always",
    }}>
      <img
        src={url}
        alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill" }}
      />
      {fields.map(f => {
        const val = data[f.key];
        if (!val) return null;
        return (
          <div
            key={f.key}
            style={{
              position: "absolute",
              left: `${f.l}%`,
              top: `${f.t}%`,
              width: `${f.w}%`,
              height: f.h ? `${f.h}%` : "auto",
              zIndex: 2,
              fontSize: "1.05vw",
              color: "#c0005a",
              fontWeight: 600,
              fontFamily: "Arial, sans-serif",
              whiteSpace: "pre-wrap",
              lineHeight: 1.35,
              padding: "1px 2px",
              overflowHidden: "overflow",
            }}
          >
            {val}
          </div>
        );
      })}
    </div>
  );
}

// ─── Reference-only page ──────────────────────────────────────────────────────
function RefPage({ url }) {
  return (
    <div style={{
      position: "relative",
      width: "100%",
      paddingTop: ASPECT,
      marginBottom: 20,
      boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
      borderRadius: 4,
      overflow: "hidden",
      pageBreakAfter: "always",
    }}>
      <img src={url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill" }} />
    </div>
  );
}

// ─── Pink section heading ─────────────────────────────────────────────────────
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
    }}>
      {children}
    </div>
  );
}

function SBox({ children }) {
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
  { key: "comida",        label: "Comer"                   },
  { key: "traslado",      label: "Trasladarse silla-cama"  },
  { key: "aseo",          label: "Aseo personal"           },
  { key: "retrete",       label: "Uso del retrete"         },
  { key: "banio",         label: "Bañarse"                 },
  { key: "desplazamiento",label: "Desplazarse"             },
  { key: "escaleras",     label: "Subir/bajar escaleras"   },
  { key: "vestido",       label: "Vestirse"                },
  { key: "deposicion",    label: "Control de heces"        },
  { key: "orina",         label: "Control de orina"        },
];

const TINETTI_EQ = [
  { key:"eq1",  label:"1. Equilibrio sentado"          },
  { key:"eq2",  label:"2. Incorporación"               },
  { key:"eq3",  label:"3. Intento de incorporación"    },
  { key:"eq4",  label:"4. Equilibrio al levantarse"    },
  { key:"eq5",  label:"5. Bipedestación"               },
  { key:"eq6",  label:"6. Recibe empujón"              },
  { key:"eq7",  label:"7. Ojos cerrados"               },
  { key:"eq8a", label:"8A. Giro 360° (pasos)"          },
  { key:"eq8b", label:"8B. Giro 360° (seguridad)"      },
  { key:"eq9",  label:"9. Sentarse"                    },
];

const TINETTI_M = [
  { key:"m1", label:"1. Inicio de la marcha"       },
  { key:"m2", label:"2. Longitud paso derecho"     },
  { key:"m3", label:"3. Longitud paso izquierdo"   },
  { key:"m4", label:"4. Simetría del paso"         },
  { key:"m5", label:"5. Fluidez del paso"          },
  { key:"m6", label:"6. Trayectoria"               },
  { key:"m7", label:"7. Tronco"                    },
  { key:"m8", label:"8. Postura en la marcha"      },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function PatientFormView() {
  const { entryId } = useParams();
  const { token } = useOutletContext();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!document.getElementById("pfv-print-style")) {
      const tag = document.createElement("style");
      tag.id = "pfv-print-style";
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
  const barthelClass =
    barthelTotal < 20 ? "Dependencia Total" :
    barthelTotal <= 35 ? "Dependencia Severa" :
    barthelTotal <= 55 ? "Dependencia Moderada" :
    barthelTotal <= 95 ? "Dependencia Leve" : "Independencia";
  const tinEq = TINETTI_EQ.reduce((s, i) => s + (Number(d[`tinetti_${i.key}`]) || 0), 0);
  const tinM  = TINETTI_M.reduce((s, i) => s + (Number(d[`tinetti_${i.key}`]) || 0), 0);

  const hasBarthel = BARTHEL_ITEMS.some(i => d[`barthel_${i.key}`] !== "" && d[`barthel_${i.key}`] !== undefined);
  const hasTinetti = TINETTI_EQ.some(i => d[`tinetti_${i.key}`] !== "" && d[`tinetti_${i.key}`] !== undefined);
  const hasTone = d.ashworth_score || d.campbell_score;
  const hasIsncsci = d.nli || d.uer || d.ais;

  const hasSoap = d.soap_s || d.soap_o || d.soap_a || d.soap_p;

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 1, md: 2 } }}>
      {/* Top bar */}
      <Box className="no-print" sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} variant="outlined" size="small">
          Regresar
        </Button>
        <Typography variant="h6" fontWeight={800} sx={{ flex: 1, ml: 1, fontSize: { xs: 14, md: 18 } }}>
          Hoja Clínica — {date}
        </Typography>
        <Button
          startIcon={<PrintIcon />}
          onClick={() => window.print()}
          variant="contained"
          size="small"
          sx={{ bgcolor: "#f06292", "&:hover": { bgcolor: "#e91e63" } }}
        >
          Imprimir
        </Button>
      </Box>

      <div id="pfv-print">

        {/* PAGE 1 — Datos del Paciente + Historia + Motivo + Objetivos */}
        <PdfPage url={PAGES[0]} fields={P1_FIELDS} data={d} />

        {/* PAGE 2 — Interconsulta + Consentimiento + Firma */}
        <PdfPage url={PAGES[1]} fields={P2_FIELDS} data={d} />

        {/* PAGES 3-4 — Seguimiento (reference) */}
        <RefPage url={PAGES[2]} />
        <RefPage url={PAGES[3]} />

        {/* SOAP digital */}
        {hasSoap && (
          <>
            <SH>Notas SOAP</SH>
            <SBox>
              {[
                { k: "soap_s", l: "S — Subjetivo" },
                { k: "soap_o", l: "O — Objetivo" },
                { k: "soap_a", l: "A — Análisis" },
                { k: "soap_p", l: "P — Plan" },
              ].filter(f => d[f.k]).map(f => (
                <div key={f.k} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#c0005a", textTransform: "uppercase", marginBottom: 3 }}>{f.l}</div>
                  <div style={{ fontSize: 13, whiteSpace: "pre-wrap", padding: "4px 0", borderBottom: "1px solid #f8bbd0" }}>{d[f.k]}</div>
                </div>
              ))}
            </SBox>
          </>
        )}

        {/* PAGE 5 — ISNCSCI (reference) */}
        <RefPage url={PAGES[4]} />

        {/* ISNCSCI digital */}
        {hasIsncsci && (
          <>
            <SH>ISNCSCI — Resultados</SH>
            <SBox>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 8 }}>
                {[
                  { k: "uer", l: "UE Derecho" }, { k: "uel", l: "UE Izquierdo" },
                  { k: "ler", l: "LE Derecho" }, { k: "lel", l: "LE Izquierdo" },
                  { k: "lte", l: "LT Derecho" }, { k: "ltl", l: "LT Izquierdo" },
                  { k: "pper", l: "PP Derecho" }, { k: "ppel", l: "PP Izquierdo" },
                ].map(f => d[f.k] ? (
                  <div key={f.k}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#888" }}>{f.l}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#c0005a" }}>{d[f.k]}</div>
                  </div>
                ) : null)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {[{ k: "nli", l: "NLI" }, { k: "complete_incomplete", l: "Completa/Incompleta" }, { k: "ais", l: "AIS" }].map(f => d[f.k] ? (
                  <div key={f.k}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#888" }}>{f.l}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#c0005a" }}>{d[f.k]}</div>
                  </div>
                ) : null)}
              </div>
              {d.isncsci_comments && <div style={{ marginTop: 8, fontSize: 13, whiteSpace: "pre-wrap", borderTop: "1px solid #f8bbd0", paddingTop: 6 }}>{d.isncsci_comments}</div>}
            </SBox>
          </>
        )}

        {/* PAGE 6 — Barthel (reference) */}
        <RefPage url={PAGES[5]} />

        {/* Barthel results */}
        {hasBarthel && (
          <>
            <SH>Escala de Barthel — Resultado del Paciente</SH>
            <SBox>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <tbody>
                  {BARTHEL_ITEMS.map(item => {
                    const val = d[`barthel_${item.key}`];
                    if (val === "" || val === undefined) return null;
                    return (
                      <tr key={item.key} style={{ borderBottom: "1px solid #f8bbd0" }}>
                        <td style={{ padding: "4px 8px", width: "40%", fontWeight: 600 }}>{item.label}</td>
                        <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: 700, color: "#c0005a" }}>{val} pts</td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: "#fce4ec" }}>
                    <td style={{ padding: "6px 8px", fontWeight: 700 }}>Total — {barthelClass}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 800, color: "#c0005a", fontSize: 16 }}>{barthelTotal}/100</td>
                  </tr>
                </tbody>
              </table>
            </SBox>
          </>
        )}

        {/* PAGE 7 — Ashworth + Campbell (reference) */}
        <RefPage url={PAGES[6]} />

        {/* Tone results */}
        {hasTone && (
          <>
            <SH>Tono Muscular — Resultado del Paciente</SH>
            <SBox>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                {d.ashworth_score && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#888" }}>Ashworth</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#c0005a" }}>{d.ashworth_score}</div>
                  </div>
                )}
                {d.campbell_score && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#888" }}>Campbell</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#c0005a" }}>{d.campbell_score}</div>
                  </div>
                )}
              </div>
              {d.tono_notes && <div style={{ marginTop: 8, fontSize: 13, whiteSpace: "pre-wrap", borderTop: "1px solid #f8bbd0", paddingTop: 6 }}>{d.tono_notes}</div>}
            </SBox>
          </>
        )}

        {/* PAGE 8 — Tinetti (reference) */}
        <RefPage url={PAGES[7]} />

        {/* Tinetti results */}
        {hasTinetti && (
          <>
            <SH>Escala de Tinetti — Resultado del Paciente</SH>
            <SBox>
              <div style={{ fontSize: 12, marginBottom: 6, fontWeight: 700, color: "#c0005a" }}>EQUILIBRIO</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 8 }}>
                <tbody>
                  {TINETTI_EQ.map(item => {
                    const val = d[`tinetti_${item.key}`];
                    if (val === "" || val === undefined) return null;
                    return (
                      <tr key={item.key} style={{ borderBottom: "1px solid #f8bbd0" }}>
                        <td style={{ padding: "3px 8px", width: "60%" }}>{item.label}</td>
                        <td style={{ padding: "3px 8px", textAlign: "right", fontWeight: 700, color: "#c0005a" }}>{val}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: tinEq < 10 ? "#ffebee" : "#fce4ec" }}>
                    <td style={{ padding: "5px 8px", fontWeight: 700 }}>Total Equilibrio {tinEq < 10 ? "⚠ Alto riesgo caída" : ""}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 800, color: tinEq < 10 ? "#b71c1c" : "#c0005a", fontSize: 15 }}>{tinEq}/16</td>
                  </tr>
                </tbody>
              </table>
              <div style={{ fontSize: 12, marginBottom: 6, fontWeight: 700, color: "#c0005a" }}>MARCHA</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 8 }}>
                <tbody>
                  {TINETTI_M.map(item => {
                    const val = d[`tinetti_${item.key}`];
                    if (val === "" || val === undefined) return null;
                    return (
                      <tr key={item.key} style={{ borderBottom: "1px solid #f8bbd0" }}>
                        <td style={{ padding: "3px 8px", width: "60%" }}>{item.label}</td>
                        <td style={{ padding: "3px 8px", textAlign: "right", fontWeight: 700, color: "#c0005a" }}>{val}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: "#fce4ec" }}>
                    <td style={{ padding: "5px 8px", fontWeight: 700 }}>Total Marcha</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 800, color: "#c0005a", fontSize: 15 }}>{tinM}/12</td>
                  </tr>
                </tbody>
              </table>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ background: "#c0005a", borderRadius: 6, padding: "6px 18px", fontWeight: 800, color: "#fff", fontSize: 15 }}>
                  Total Tinetti: {tinEq + tinM}/28
                </div>
              </div>
              {d.tinetti_notes && <div style={{ marginTop: 8, fontSize: 13, whiteSpace: "pre-wrap", borderTop: "1px solid #f8bbd0", paddingTop: 6 }}>{d.tinetti_notes}</div>}
            </SBox>
          </>
        )}

      </div>
    </Box>
  );
}
