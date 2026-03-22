import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

const DAYS_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MONTHS_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const clean = String(dateStr).includes("T") ? String(dateStr).split("T")[0] : String(dateStr);
  const [y, m, d] = clean.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return `${String(d).padStart(2,"0")}/${String(m).padStart(2,"0")}/${y}`;
}

function fmtDateLong(dateStr) {
  if (!dateStr) return "—";
  const clean = String(dateStr).includes("T") ? String(dateStr).split("T")[0] : String(dateStr);
  const [y, m, d] = clean.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const dayName = DAYS_ES[new Date(y, m - 1, d).getDay()];
  return `${dayName} ${d} de ${MONTHS_ES[m-1]} de ${y}`;
}

function addDays(dateStr, days) {
  if (!dateStr) return "—";
  const clean = String(dateStr).includes("T") ? String(dateStr).split("T")[0] : String(dateStr);
  const [y, m, d] = clean.split("-").map(Number);
  if (!y) return "—";
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getDate()} ${MONTHS_ES[dt.getMonth()]} ${dt.getFullYear()}`;
}

function getDeliveryTime(dateStr, hours) {
  if (!dateStr || !hours || hours.length === 0) return "";
  const clean = String(dateStr).includes("T") ? String(dateStr).split("T")[0] : String(dateStr);
  const [y, m, d] = clean.split("-").map(Number);
  if (!y) return "";
  const dayIdx = new Date(y, m - 1, d).getDay();
  const entry = hours.find(h => h.day_of_week === dayIdx && h.is_open && h.close_time);
  if (!entry) return "";
  const [hh, mm] = entry.close_time.split(":").map(Number);
  let closeH = hh - 2;
  if (closeH < 0) closeH = 0;
  return `${String(closeH).padStart(2, "0")}:${String(mm).padStart(2, "0")} hrs`;
}

function getDayName(dateStr) {
  if (!dateStr) return "";
  const clean = String(dateStr).includes("T") ? String(dateStr).split("T")[0] : String(dateStr);
  const [y, m, d] = clean.split("-").map(Number);
  if (!y) return "";
  return DAYS_ES[new Date(y, m - 1, d).getDay()];
}

// ── Amount in Spanish words ──────────────────────────────────────────────────
const ONES = ["","UNO","DOS","TRES","CUATRO","CINCO","SEIS","SIETE","OCHO","NUEVE",
              "DIEZ","ONCE","DOCE","TRECE","CATORCE","QUINCE","DIECISÉIS","DIECISIETE",
              "DIECIOCHO","DIECINUEVE"];
const TENS = ["","","VEINTE","TREINTA","CUARENTA","CINCUENTA","SESENTA","SETENTA","OCHENTA","NOVENTA"];
const HUNDREDS = ["","CIENTO","DOSCIENTOS","TRESCIENTOS","CUATROCIENTOS","QUINIENTOS",
                  "SEISCIENTOS","SETECIENTOS","OCHOCIENTOS","NOVECIENTOS"];

function threeDigits(n) {
  if (n === 0) return "";
  if (n === 100) return "CIEN";
  const h = Math.floor(n / 100);
  const rem = n % 100;
  const hStr = h > 0 ? HUNDREDS[h] : "";
  let tStr = "";
  if (rem > 0 && rem < 20) {
    tStr = ONES[rem];
  } else if (rem >= 20) {
    const t = Math.floor(rem / 10);
    const o = rem % 10;
    tStr = TENS[t] + (o > 0 ? " Y " + ONES[o] : "");
  }
  return [hStr, tStr].filter(Boolean).join(" ");
}

function numberToWords(amount) {
  if (!amount || isNaN(amount)) return "CERO PESOS CON 00/100 M.N.";
  const total = Math.round(parseFloat(amount) * 100);
  const pesos = Math.floor(total / 100);
  const cents = total % 100;
  let words = "";
  if (pesos === 0) {
    words = "CERO";
  } else if (pesos < 1000) {
    words = threeDigits(pesos);
  } else if (pesos < 1000000) {
    const miles = Math.floor(pesos / 1000);
    const rem = pesos % 1000;
    words = (miles === 1 ? "MIL" : threeDigits(miles) + " MIL") + (rem > 0 ? " " + threeDigits(rem) : "");
  } else {
    words = String(pesos);
  }
  return `${words} PESOS CON ${String(cents).padStart(2,"0")}/100 M.N.`;
}
// ────────────────────────────────────────────────────────────────────────────

function buildCopyHTML(order, b, businessHours, barcodeDataUri, label) { // eslint-disable-line no-unused-vars
  const totalPieces = (order.items || []).reduce((s, i) => s + (parseInt(i.total_pieces) || parseInt(i.quantity) * (parseInt(i.units) || 1) || 0), 0);
  const subtotal    = parseFloat(order.subtotal || 0);
  const discount    = parseFloat(order.discount || 0);
  const tax         = parseFloat(order.tax || 0);
  const total       = parseFloat(order.total_amount || 0);
  const paid        = parseFloat(order.amount_paid || 0);
  const resta       = Math.max(0, total - paid);
  const deliveryTime = getDeliveryTime(order.delivery_date, businessHours);
  const dayName      = getDayName(order.delivery_date);
  const importeLetra = numberToWords(total);
  const recargosDate = addDays(order.delivery_date, 90);

  const headerLines = [];
  if (b.rfc || b.curp || b.sime) {
    headerLines.push([b.rfc && `R.F.C.: ${b.rfc}`, b.curp && `CURP: ${b.curp}`, b.sime && `SIEM: ${b.sime}`].filter(Boolean).join("&nbsp;&nbsp;"));
  }
  if (b.alcaldia || b.city) {
    headerLines.push([b.alcaldia && `Deleg.: ${b.alcaldia}`, b.city && `Col.: ${b.city}`].filter(Boolean).join("&nbsp;&nbsp;"));
  }
  if (b.street || b.ext_num) {
    headerLines.push(`Dirección: ${b.street || ""}${b.ext_num ? ` No. ${b.ext_num}` : ""}${b.int_num ? ` Int. ${b.int_num}` : ""}${b.colonia ? `  Col. ${b.colonia}` : ""}${b.cp ? `  C.P. ${b.cp}` : ""}${b.phone ? `  Tel.: ${b.phone}` : ""}`);
  }
  if (b.business_hours_text) {
    headerLines.push(`Horario de Atención al Público: ${b.business_hours_text}`);
  }
  if (b.regimen_fiscal) {
    headerLines.push(`Reg. Canal/Pago: ${b.regimen_fiscal}`);
  }

  const barcodeImg = barcodeDataUri
    ? `<img src="${barcodeDataUri}" style="height:36px;max-width:180px;display:block" />`
    : `<span style="font-family:monospace;font-size:11px;font-weight:bold">${order.folio || order.id}</span>`;

  const itemRows = (order.items || []).map(item => {
    const lineTotal = (parseInt(item.quantity) || 0) * parseFloat(item.unit_price || 0);
    return `<tr style="border-bottom:1px solid #ddd">
      <td style="padding:1px 2px;text-align:center">${item.quantity}</td>
      <td style="padding:1px 4px">${item.product_name || ""}${item.service_name ? ` (${item.service_name})` : ""}</td>
      <td style="padding:1px 2px;text-align:center">${item.color || "—"}</td>
      <td style="padding:1px 2px;text-align:center">${item.stamp || "—"}</td>
      <td style="padding:1px 2px;text-align:center">${item.process || item.service_name || "—"}</td>
      <td style="padding:1px 2px;text-align:right">$${parseFloat(item.unit_price || 0).toFixed(2)}</td>
      <td style="padding:1px 2px;text-align:right">$${lineTotal.toFixed(2)}</td>
    </tr>`;
  }).join("");

  const paymentRows = (order.payments || []).map(p =>
    `<tr style="font-size:7.5px;color:#555">
      <td>${{ cash: "Efectivo", card: "Tarjeta", points: "Puntos" }[p.method] || p.method}</td>
      <td style="text-align:right">$${parseFloat(p.amount).toFixed(2)}</td>
    </tr>`
  ).join("");

  return `
  <div style="display:block;width:100%;padding:4mm 5mm;box-sizing:border-box;position:relative;overflow:hidden">

    <!-- HEADER -->
    <div style="text-align:center;font-size:13px;font-weight:bold;margin-bottom:1px;text-transform:uppercase;letter-spacing:0.5px">${b.business_name || b.name || "TINTORERÍA"}</div>
    ${headerLines.map(l => `<div style="text-align:center;font-size:7.5px">${l}</div>`).join("")}

    <div style="border-top:1px solid #000;margin:3px 0"></div>

    <!-- NOTA NUMBER + BARCODE -->
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="vertical-align:middle;width:55%">
          <span style="font-size:8px">Venta No.&nbsp;</span>
          <span style="font-size:22px;font-weight:bold;letter-spacing:1px">${order.folio || `#${order.id}`}</span>
        </td>
        <td style="text-align:right;vertical-align:middle">
          ${barcodeImg}
        </td>
      </tr>
    </table>

    <!-- FECHA RECEPCIÓN + ENTREGA -->
    <table style="width:100%;border-collapse:collapse;font-size:8px;margin-top:2px">
      <tr>
        <td style="width:50%"><b>Recepción:</b> ${order.created_by_name || "—"}</td>
        <td style="width:50%;text-align:right"><b>Call:</b> ${order.client?.phone || order.client_phone || "—"}</td>
      </tr>
      <tr>
        <td><b>Cliente:</b> ${order.client_name || "—"}</td>
        <td style="text-align:right">
          <b>Recibida:</b> ${fmtDate(order.order_date)}&nbsp;&nbsp;
          <b>Entrega:</b> ${fmtDate(order.delivery_date)} ${deliveryTime} <b>${dayName}</b>
        </td>
      </tr>
    </table>

    <div style="border-top:1px dashed #000;margin:3px 0"></div>

    <!-- ITEMS TABLE -->
    <table style="width:100%;border-collapse:collapse;font-size:7.5px">
      <thead>
        <tr style="border-bottom:1px solid #000;background:#f5f5f5">
          <th style="padding:1px 2px;text-align:center;width:24px">Cant</th>
          <th style="padding:1px 4px;text-align:left">Descripción</th>
          <th style="padding:1px 2px;text-align:center;width:50px">Color</th>
          <th style="padding:1px 2px;text-align:center;width:40px">Estamp.</th>
          <th style="padding:1px 2px;text-align:center;width:50px">Proceso</th>
          <th style="padding:1px 2px;text-align:right;width:50px">P.Unit.</th>
          <th style="padding:1px 2px;text-align:right;width:50px">Importe</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div style="border-top:1px dashed #000;margin:3px 0"></div>

    ${order.notes ? `<div style="font-size:7.5px;margin-bottom:2px"><b>Observaciones:</b> ${order.notes}</div>` : ""}

    <!-- FOOTER: LEFT + RIGHT -->
    <table style="width:100%;border-collapse:collapse;font-size:8px">
      <tr style="vertical-align:top">
        <td style="width:58%;padding-right:8px">
          <div><b>Fecha de Entrega:</b> ${fmtDateLong(order.delivery_date)} Hora Entrega ${deliveryTime || "—"}</div>
          <div><b>Con recargos después de:</b> ${recargosDate}</div>
          <div style="margin-top:3px"><b>Pzas.</b> ${totalPieces}&nbsp;&nbsp;&nbsp;<b>Kgs.</b> 0.00</div>
          <div><b>Atendido por:</b> ${order.created_by_name || "—"}</div>
          <div style="margin-top:3px"><b>A Cuenta</b> $${paid.toFixed(2)}&nbsp;&nbsp;&nbsp;<b>Resta</b> $${resta.toFixed(2)}</div>
          <div style="margin-top:2px;font-size:7px"><b>Importe Con Letra:</b> ${importeLetra}</div>
        </td>
        <td style="width:42%;border-left:1px solid #ccc;padding-left:6px">
          <table style="width:100%;border-collapse:collapse;font-size:8px">
            <tr><td>Sub Total</td><td style="text-align:right">$${subtotal.toFixed(2)}</td></tr>
            <tr><td>Cargo Adicional</td><td style="text-align:right">$0.00</td></tr>
            <tr><td>Descuento</td><td style="text-align:right">${discount > 0 ? `-$${discount.toFixed(2)}` : "$0.00"}</td></tr>
            <tr><td>IVA</td><td style="text-align:right">$${tax.toFixed(2)}</td></tr>
            <tr style="font-weight:bold;border-top:1px solid #000">
              <td>Total</td><td style="text-align:right">$${total.toFixed(2)}</td>
            </tr>
            ${paymentRows}
          </table>
        </td>
      </tr>
    </table>

    <!-- SIGNATURE LINES -->
    <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:7.5px">
      <tr>
        <td style="width:48%;border-top:1px solid #000;text-align:center;padding-top:2px">FIRMA O RÚBRICA DE AUTORIZACIÓN</td>
        <td style="width:4%"></td>
        <td style="width:48%;border-top:1px solid #000;text-align:center;padding-top:2px">CLIENTE</td>
      </tr>
    </table>

    <!-- LABEL ORIGINAL/COPIA -->
    <div style="position:absolute;bottom:4mm;right:5mm;font-size:10px;font-weight:bold;color:#555;letter-spacing:2px;border:1px solid #999;padding:1px 5px">
      ${label}
    </div>

  </div>`;
}

function buildReceiptHTML(order, businessInfo, businessHours, barcodeDataUri) {
  const b = businessInfo || {};
  const totalPieces = (order.items || []).reduce((s, i) => s + (parseInt(i.total_pieces) || parseInt(i.quantity) * (parseInt(i.units) || 1) || 0), 0);
  const subtotal    = parseFloat(order.subtotal || 0);
  const discount    = parseFloat(order.discount || 0);
  const tax         = parseFloat(order.tax || 0);
  const total       = parseFloat(order.total_amount || 0);
  const paid        = parseFloat(order.amount_paid || 0);
  const resta       = Math.max(0, total - paid);
  const deliveryTime = getDeliveryTime(order.delivery_date, businessHours);
  const dayName      = getDayName(order.delivery_date);
  const importeLetra = numberToWords(total);
  const recargosDate = addDays(order.delivery_date, 90);

  const headerLines = [];
  if (b.rfc || b.curp || b.sime)
    headerLines.push([b.rfc && `R.F.C.: ${b.rfc}`, b.curp && `CURP: ${b.curp}`, b.sime && `SIEM: ${b.sime}`].filter(Boolean).join("   "));
  if (b.street)
    headerLines.push(`${b.street}${b.ext_num ? ` No. ${b.ext_num}` : ""}${b.colonia ? `  Col. ${b.colonia}` : ""}${b.cp ? `  C.P. ${b.cp}` : ""}${b.phone ? `  Tel.: ${b.phone}` : ""}`);
  if (b.alcaldia || b.city)
    headerLines.push([b.alcaldia, b.city].filter(Boolean).join("  "));
  if (b.regimen_fiscal)
    headerLines.push(`Régimen: ${b.regimen_fiscal}`);

  const barcodeImg = barcodeDataUri
    ? `<img src="${barcodeDataUri}" style="height:40px;display:block;margin-left:auto" />`
    : `<span style="font-size:12px;font-weight:bold">${order.folio || order.id}</span>`;

  const itemRows = (order.items || []).map(item => {
    const lineTotal = (parseInt(item.quantity)||0) * parseFloat(item.unit_price||0);
    return `<tr>
      <td style="text-align:center;padding:2px 2px">${item.quantity}</td>
      <td style="padding:2px 4px">${item.product_name || ""}${item.service_name ? ` (${item.service_name})` : ""}</td>
      <td style="text-align:center;padding:2px 2px">${item.color || "—"}</td>
      <td style="text-align:center;padding:2px 2px">${item.stamp || "—"}</td>
      <td style="text-align:center;padding:2px 2px">${item.process || item.service_name || "—"}</td>
      <td style="text-align:right;padding:2px 2px">$${parseFloat(item.unit_price||0).toFixed(2)}</td>
      <td style="text-align:right;padding:2px 2px">$${lineTotal.toFixed(2)}</td>
    </tr>`;
  }).join("");

  const paymentRows = (order.payments || []).map(p =>
    `<tr><td>${{cash:"Efectivo",card:"Tarjeta",points:"Puntos"}[p.method]||p.method}</td><td style="text-align:right">$${parseFloat(p.amount).toFixed(2)}</td></tr>`
  ).join("");

  const copy = (label) => `
  <div style="width:100%;height:215.9mm;padding:10px 14px;box-sizing:border-box;position:relative;overflow:hidden;font-family:'Courier New',Courier,monospace;font-size:9.5px;color:#000">
    <div style="text-align:center;font-size:13px;font-weight:bold;margin-bottom:2px">${b.business_name || b.name || ""}</div>
    ${headerLines.map(l=>`<div style="text-align:center;font-size:8px">${l}</div>`).join("")}
    <hr style="border:none;border-top:1px dashed #000;margin:5px 0"/>
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="font-weight:bold;font-size:11px;vertical-align:middle;white-space:nowrap;width:50px">Nota:</td>
        <td style="text-align:center">${barcodeImg}</td>
      </tr>
    </table>
    <table style="width:100%;border-collapse:collapse;margin-top:4px">
      <tr>
        <td style="width:34%"><b>Cliente:</b> ${order.client_name||"—"}</td>
        <td style="width:33%;text-align:center"><b>Recibida:</b><br/>${fmtDate(order.order_date)}</td>
        <td style="width:33%;text-align:right"><b>Entrega:</b><br/>${fmtDate(order.delivery_date)} ${deliveryTime} <b>${dayName}</b></td>
      </tr>
    </table>
    <hr style="border:none;border-top:1px dashed #000;margin:5px 0"/>
    <table style="width:100%;border-collapse:collapse;font-size:9px">
      <thead>
        <tr style="border-bottom:1px solid #000;font-weight:bold">
          <th style="text-align:left">Artículo / Servicio</th>
          <th style="text-align:center">Cant</th>
          <th style="text-align:right">P.Unit</th>
          <th style="text-align:right">Subtotal</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    <hr style="border:none;border-top:1px dashed #000;margin:5px 0"/>
    <table style="width:100%;border-collapse:collapse;margin-top:4px">
      <tr style="vertical-align:top">
        <td style="width:55%">
          <div><b>Total piezas:</b> ${totalPieces}&nbsp;&nbsp;&nbsp;<b>Kgs.:</b> 0.00</div>
          ${order.created_by_name ? `<div><b>Atendido por:</b> ${order.created_by_name}</div>` : ""}
          <div style="margin-top:4px"><b>A cuenta:</b> $${paid.toFixed(2)}&nbsp;&nbsp;&nbsp;<b>Resta:</b> $${resta>0?resta.toFixed(2):"0.00"}</div>
        </td>
        <td style="width:45%">
          <table style="width:100%;border-collapse:collapse;font-size:9px">
            <tr><td>Subtotal</td><td style="text-align:right">$${subtotal.toFixed(2)}</td></tr>
            ${discount>0?`<tr><td>Descuento</td><td style="text-align:right">-$${discount.toFixed(2)}</td></tr>`:""}
            <tr><td>IVA</td><td style="text-align:right">$${tax.toFixed(2)}</td></tr>
            <tr style="font-weight:bold;border-top:1px solid #000">
              <td>Total</td><td style="text-align:right">$${total.toFixed(2)}</td>
            </tr>
            ${paymentRows}
          </table>
        </td>
      </tr>
    </table>
    ${order.notes?`<div style="margin-top:4px"><b>Notas:</b> ${order.notes}</div>`:""}
    <div style="position:absolute;bottom:6px;right:10px;font-size:8px;font-weight:bold;color:#999;letter-spacing:2px">${label}</div>
  </div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      @page{size:letter landscape;margin:0}
      html,body{width:279.4mm;height:215.9mm;overflow:hidden}
      .page{display:flex;flex-direction:row;width:279.4mm;height:215.9mm}
      .copy{flex:0 0 50%;height:215.9mm;overflow:hidden}
      .cut{flex:0 0 3px;height:215.9mm;border-left:1.5px dashed #888}
    </style>
  </head><body>
    <div class="page">
      <div class="copy">${copy("ORIGINAL")}</div>
      <div class="cut"></div>
      <div class="copy">${copy("COPIA")}</div>
    </div>
  </body></html>`;
}



export function usePrintReceipt() {
  return function printReceipt(order, businessInfo, businessHours) {
    const canvas = document.createElement("canvas");
    let barcodeDataUri = null;
    try {
      JsBarcode(canvas, order.folio || String(order.id), {
        format: "CODE128", displayValue: true,
        fontSize: 9, height: 30, width: 1.4, margin: 2,
      });
      barcodeDataUri = canvas.toDataURL("image/png");
    } catch (e) { console.error(e); }

    const html = buildReceiptHTML(order, businessInfo, businessHours, barcodeDataUri);
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) { alert("Permite ventanas emergentes para imprimir."); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  };
}

export default function OrderReceipt({ order, businessInfo, businessHours }) {
  const bcRef = useRef(null);

  useEffect(() => {
    if (bcRef.current && (order?.folio || order?.id)) {
      try {
        JsBarcode(bcRef.current, order.folio || String(order.id), {
          format: "CODE128", displayValue: true,
          fontSize: 9, height: 30, width: 1.4, margin: 2,
        });
      } catch (e) { console.error(e); }
    }
  }, [order?.folio, order?.id]);

  if (!order) return null;
  const b = businessInfo || {};
  const totalPieces = (order.items || []).reduce((s, i) => s + (parseInt(i.total_pieces) || parseInt(i.quantity) * (parseInt(i.units) || 1) || 0), 0);
  const subtotal = parseFloat(order.subtotal || 0);
  const discount = parseFloat(order.discount || 0);
  const tax      = parseFloat(order.tax || 0);
  const total    = parseFloat(order.total_amount || 0);
  const paid     = parseFloat(order.amount_paid || 0);
  const resta    = Math.max(0, total - paid);
  const deliveryTime = getDeliveryTime(order.delivery_date, businessHours);
  const dayName      = getDayName(order.delivery_date);
  const importeLetra = numberToWords(total);
  const recargosDate = addDays(order.delivery_date, 90);

  const s = {
    wrap:  { fontFamily: "'Arial Narrow', Arial, sans-serif", fontSize: "9px", color: "#000", padding: "8px 12px", maxWidth: "680px", margin: "0 auto", border: "1px solid #ccc", borderRadius: 4, position: "relative" },
    center:{ textAlign: "center" },
    bold:  { fontWeight: "bold" },
    hr:    { border: "none", borderTop: "1px dashed #000", margin: "4px 0" },
    hrSolid: { border: "none", borderTop: "1px solid #000", margin: "3px 0" },
    small: { fontSize: "7.5px" },
  };

  return (
    <div style={s.wrap}>
      <div style={{ ...s.center, ...s.bold, fontSize: "13px", marginBottom: "1px", textTransform: "uppercase" }}>{b.business_name || b.name || ""}</div>
      {(b.rfc || b.curp || b.sime) && <div style={{ ...s.center, ...s.small }}>{[b.rfc && `R.F.C.: ${b.rfc}`, b.curp && `CURP: ${b.curp}`, b.sime && `SIEM: ${b.sime}`].filter(Boolean).join("   ")}</div>}
      {(b.alcaldia || b.city) && <div style={{ ...s.center, ...s.small }}>{[b.alcaldia && `Deleg.: ${b.alcaldia}`, b.city && `Col.: ${b.city}`].filter(Boolean).join("   ")}</div>}
      {b.street && <div style={{ ...s.center, ...s.small }}>Dirección: {b.street}{b.ext_num ? ` No. ${b.ext_num}` : ""}{b.colonia ? `  Col. ${b.colonia}` : ""}{b.cp ? `  C.P. ${b.cp}` : ""}{b.phone ? `  Tel.: ${b.phone}` : ""}</div>}
      {b.regimen_fiscal && <div style={{ ...s.center, ...s.small }}>Régimen: {b.regimen_fiscal}</div>}

      <div style={s.hrSolid} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontSize: "8px" }}>Venta No. </span>
          <span style={{ fontSize: "22px", fontWeight: "bold" }}>{order.folio || `#${order.id}`}</span>
        </div>
        <svg ref={bcRef} style={{ height: "36px" }} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", marginTop: "2px" }}>
        <div><b>Recepción:</b> {order.created_by_name || "—"}&nbsp;&nbsp;<b>Call:</b> {order.client?.phone || "—"}</div>
        <div style={{ textAlign: "right" }}><b>Recibida:</b> {fmtDate(order.order_date)}&nbsp;&nbsp;<b>Entrega:</b> {fmtDate(order.delivery_date)} {deliveryTime} <b>{dayName}</b></div>
      </div>
      <div style={{ fontSize: "8px" }}><b>Cliente:</b> {order.client_name || "—"}</div>

      <div style={s.hr} />

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "7.5px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #000", background: "#f5f5f5" }}>
            <th style={{ textAlign: "center", padding: "1px 2px" }}>Cant</th>
            <th style={{ textAlign: "left",   padding: "1px 4px" }}>Descripción</th>
            <th style={{ textAlign: "center", padding: "1px 2px" }}>Color</th>
            <th style={{ textAlign: "center", padding: "1px 2px" }}>Estamp.</th>
            <th style={{ textAlign: "center", padding: "1px 2px" }}>Proceso</th>
            <th style={{ textAlign: "right",  padding: "1px 2px" }}>P.Unit.</th>
            <th style={{ textAlign: "right",  padding: "1px 2px" }}>Importe</th>
          </tr>
        </thead>
        <tbody>
          {(order.items || []).map((item, i) => {
            const lineTotal = (parseInt(item.quantity)||0) * parseFloat(item.unit_price||0);
            return (
              <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ textAlign: "center", padding: "1px 2px" }}>{item.quantity}</td>
                <td style={{ padding: "1px 4px" }}>{item.product_name}{item.service_name ? ` (${item.service_name})` : ""}</td>
                <td style={{ textAlign: "center", padding: "1px 2px" }}>{item.color || "—"}</td>
                <td style={{ textAlign: "center", padding: "1px 2px" }}>{item.stamp || "—"}</td>
                <td style={{ textAlign: "center", padding: "1px 2px" }}>{item.process || item.service_name || "—"}</td>
                <td style={{ textAlign: "right",  padding: "1px 2px" }}>${parseFloat(item.unit_price||0).toFixed(2)}</td>
                <td style={{ textAlign: "right",  padding: "1px 2px" }}>${lineTotal.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={s.hr} />
      {order.notes && <div style={{ fontSize: "7.5px", marginBottom: "3px" }}><b>Observaciones:</b> {order.notes}</div>}

      <div style={{ display: "flex", gap: "8px", fontSize: "8px" }}>
        <div style={{ flex: "0 0 58%" }}>
          <div><b>Fecha de Entrega:</b> {fmtDateLong(order.delivery_date)} {deliveryTime || "—"}</div>
          <div><b>Con recargos después de:</b> {recargosDate}</div>
          <div style={{ marginTop: "3px" }}><b>Pzas.</b> {totalPieces}&nbsp;&nbsp;&nbsp;<b>Kgs.</b> 0.00</div>
          <div><b>Atendido por:</b> {order.created_by_name || "—"}</div>
          <div style={{ marginTop: "3px" }}><b>A Cuenta</b> ${paid.toFixed(2)}&nbsp;&nbsp;&nbsp;<b>Resta</b> ${resta.toFixed(2)}</div>
          <div style={{ fontSize: "7px", marginTop: "2px" }}><b>Importe Con Letra:</b> {importeLetra}</div>
        </div>
        <div style={{ flex: "0 0 42%", borderLeft: "1px solid #ccc", paddingLeft: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Sub Total</span><span>${subtotal.toFixed(2)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Cargo Adicional</span><span>$0.00</span></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Descuento</span><span>{discount > 0 ? `-$${discount.toFixed(2)}` : "$0.00"}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>IVA</span><span>${tax.toFixed(2)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", borderTop: "1px solid #000", marginTop: "2px", paddingTop: "2px" }}>
            <span>Total</span><span>${total.toFixed(2)}</span>
          </div>
          {(order.payments || []).map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "7.5px", color: "#555" }}>
              <span>{{ cash: "Efectivo", card: "Tarjeta", points: "Puntos" }[p.method] || p.method}</span>
              <span>${parseFloat(p.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", fontSize: "7.5px" }}>
        <div style={{ width: "46%", borderTop: "1px solid #000", textAlign: "center", paddingTop: "2px" }}>FIRMA O RÚBRICA DE AUTORIZACIÓN</div>
        <div style={{ width: "46%", borderTop: "1px solid #000", textAlign: "center", paddingTop: "2px" }}>CLIENTE</div>
      </div>
    </div>
  );
}
