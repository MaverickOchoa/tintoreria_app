import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

const DAYS_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const clean = String(dateStr).includes("T") ? String(dateStr).split("T")[0] : String(dateStr);
  const [y, m, d] = clean.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return `${String(d).padStart(2,"0")}/${String(m).padStart(2,"0")}/${y}`;
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

/**
 * Generates the HTML string for one receipt copy.
 * The barcode SVG is rendered via a canvas trick (data URI).
 */
function buildReceiptHTML(order, businessInfo, businessHours, barcodeDataUri) {
  const b = businessInfo || {};
  const totalPieces = (order.items || []).reduce((s, i) => s + (parseInt(i.quantity) || 0), 0);
  const subtotal = parseFloat(order.subtotal || 0);
  const discount = parseFloat(order.discount || 0);
  const tax = parseFloat(order.tax || 0);
  const total = parseFloat(order.total_amount || 0);
  const paid = parseFloat(order.amount_paid || 0);
  const resta = total - paid;
  const deliveryTime = getDeliveryTime(order.delivery_date, businessHours);
  const dayName = getDayName(order.delivery_date);

  const headerLines = [];
  if (b.rfc || b.curp || b.sime) {
    headerLines.push([b.rfc && `RFC: ${b.rfc}`, b.curp && `CURP: ${b.curp}`, b.sime && `SIEM: ${b.sime}`].filter(Boolean).join("&nbsp;&nbsp;&nbsp;"));
  }
  if (b.street) {
    headerLines.push(`${b.street}${b.ext_num ? `, #${b.ext_num}` : ""}${b.int_num ? ` Int. ${b.int_num}` : ""}`);
  }
  if (b.colonia || b.cp || b.phone) {
    headerLines.push([b.colonia && `Col. ${b.colonia}`, b.cp && `C.P. ${b.cp}`, b.phone && `Tel: ${b.phone}`].filter(Boolean).join("&nbsp;&nbsp;&nbsp;"));
  }
  if (b.alcaldia || b.city) {
    headerLines.push([b.alcaldia, b.city].filter(Boolean).join(", "));
  }
  if (b.regimen_fiscal) {
    headerLines.push(`Régimen: ${b.regimen_fiscal}`);
  }

  const itemRows = (order.items || []).map(item =>
    `<tr>
      <td>${item.product_name || ""}${item.service_name ? ` <span style="color:#555">(${item.service_name})</span>` : ""}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">$${parseFloat(item.unit_price || 0).toFixed(2)}</td>
      <td style="text-align:right">${item.quantity}&times;$${parseFloat(item.unit_price || 0).toFixed(2)}</td>
    </tr>`
  ).join("");

  const paymentRows = (order.payments || []).map(p =>
    `<tr style="font-size:8px;color:#555">
      <td>${{ cash: "Efectivo", card: "Tarjeta", points: "Puntos" }[p.method] || p.method}</td>
      <td style="text-align:right">$${parseFloat(p.amount).toFixed(2)}</td>
    </tr>`
  ).join("");

  const barcodeImg = barcodeDataUri ? `<img src="${barcodeDataUri}" style="height:40px;max-width:100%" />` : `<span style="font-size:10px;font-weight:bold">${order.folio || order.id}</span>`;

  const oneCopy = `
    <div style="display:block;width:100%;padding:10px 16px;box-sizing:border-box;clear:both;page-break-inside:avoid">
      <div style="text-align:center;font-size:13px;font-weight:bold;margin-bottom:2px">${b.business_name || b.name || ""}</div>
      ${headerLines.map(l => `<div style="text-align:center">${l}</div>`).join("")}
      <hr style="border:none;border-top:1px dashed #000;margin:5px 0"/>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="font-weight:bold;font-size:11px;vertical-align:middle;white-space:nowrap;width:50px">Nota:</td>
          <td style="text-align:center">${barcodeImg}</td>
        </tr>
      </table>
      <table style="width:100%;border-collapse:collapse;margin-top:4px">
        <tr>
          <td style="width:34%"><b>Cliente:</b> ${order.client_name || "—"}</td>
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
            <div style="margin-top:4px"><b>A cuenta:</b> $${paid.toFixed(2)}&nbsp;&nbsp;&nbsp;<b>Resta:</b> $${resta > 0 ? resta.toFixed(2) : "0.00"}</div>
          </td>
          <td style="width:45%">
            <table style="width:100%;border-collapse:collapse;font-size:9px">
              <tr><td>Subtotal</td><td style="text-align:right">$${subtotal.toFixed(2)}</td></tr>
              ${discount > 0 ? `<tr><td>Descuento</td><td style="text-align:right">-$${discount.toFixed(2)}</td></tr>` : ""}
              <tr><td>IVA</td><td style="text-align:right">$${tax.toFixed(2)}</td></tr>
              <tr style="font-weight:bold;border-top:1px solid #000">
                <td>Total</td><td style="text-align:right">$${total.toFixed(2)}</td>
              </tr>
              ${paymentRows}
            </table>
          </td>
        </tr>
      </table>
      ${order.notes ? `<div style="margin-top:4px"><b>Notas:</b> ${order.notes}</div>` : ""}
    </div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <style>
      * { box-sizing: border-box; }
      body { font-family: 'Courier New', Courier, monospace; font-size: 9.5px; margin: 0; padding: 0; color: #000; }
      @page { size: letter portrait; margin: 6mm; }
    </style>
  </head><body>
    ${oneCopy}
    <div style="display:block;width:100%;clear:both;border-top:2px dashed #aaa;margin:6px 0;text-align:center;font-size:8px;color:#aaa;letter-spacing:4px">
      - - - - - - - - - - CORTE - - - - - - - - - -
    </div>
    ${oneCopy}
  </body></html>`;
}

/**
 * Hook: returns a function printReceipt(order, businessInfo, businessHours)
 * that opens a new window and prints.
 */
export function usePrintReceipt() {
  return function printReceipt(order, businessInfo, businessHours) {
    // Generate barcode as data URI
    const canvas = document.createElement("canvas");
    let barcodeDataUri = null;
    try {
      JsBarcode(canvas, order.folio || String(order.id), {
        format: "CODE128", displayValue: true,
        fontSize: 10, height: 35, width: 1.5, margin: 3,
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

/**
 * OrderReceipt component — renders a preview inside the page (screen only).
 * For actual printing, use usePrintReceipt() hook.
 */
export default function OrderReceipt({ order, businessInfo, businessHours }) {
  const bcRef = useRef(null);

  useEffect(() => {
    if (bcRef.current && order?.folio) {
      try {
        JsBarcode(bcRef.current, order.folio, {
          format: "CODE128", displayValue: true,
          fontSize: 9, height: 30, width: 1.4, margin: 2,
        });
      } catch (e) { console.error(e); }
    }
  }, [order?.folio]);

  if (!order) return null;
  const b = businessInfo || {};
  const totalPieces = (order.items || []).reduce((s, i) => s + (parseInt(i.quantity) || 0), 0);
  const subtotal = parseFloat(order.subtotal || 0);
  const discount = parseFloat(order.discount || 0);
  const tax = parseFloat(order.tax || 0);
  const total = parseFloat(order.total_amount || 0);
  const paid = parseFloat(order.amount_paid || 0);
  const resta = total - paid;
  const deliveryTime = getDeliveryTime(order.delivery_date, businessHours);
  const dayName = getDayName(order.delivery_date);

  const s = {
    wrap: { fontFamily: "'Courier New', monospace", fontSize: "10px", color: "#000", padding: "10px 16px", maxWidth: "720px", margin: "0 auto", border: "1px solid #ccc", borderRadius: 4 },
    center: { textAlign: "center" },
    bold: { fontWeight: "bold" },
    hr: { border: "none", borderTop: "1px dashed #000", margin: "5px 0" },
    row: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
    grid4: { display: "grid", gridTemplateColumns: "1fr 40px 70px 80px", gap: "2px" },
    footer: { display: "grid", gridTemplateColumns: "1fr 180px", gap: "12px", marginTop: "6px" },
    totLine: { display: "flex", justifyContent: "space-between" },
  };

  return (
    <div style={s.wrap}>
      <div style={{ ...s.center, ...s.bold, fontSize: "13px", marginBottom: "2px" }}>{b.business_name || b.name || ""}</div>
      {(b.rfc || b.curp || b.sime) && <div style={s.center}>{[b.rfc && `RFC: ${b.rfc}`, b.curp && `CURP: ${b.curp}`, b.sime && `SIEM: ${b.sime}`].filter(Boolean).join("   ")}</div>}
      {b.street && <div style={s.center}>{b.street}{b.ext_num ? `, #${b.ext_num}` : ""}{b.int_num ? ` Int. ${b.int_num}` : ""}</div>}
      {(b.colonia || b.cp || b.phone) && <div style={s.center}>{[b.colonia && `Col. ${b.colonia}`, b.cp && `C.P. ${b.cp}`, b.phone && `Tel: ${b.phone}`].filter(Boolean).join("   ")}</div>}
      {(b.alcaldia || b.city) && <div style={s.center}>{[b.alcaldia, b.city].filter(Boolean).join(", ")}</div>}
      {b.regimen_fiscal && <div style={s.center}>Régimen: {b.regimen_fiscal}</div>}

      <hr style={s.hr} />

      <div style={s.row}>
        <span style={{ ...s.bold, fontSize: "11px" }}>Nota:</span>
        <svg ref={bcRef} style={{ height: "40px" }} />
      </div>

      <div style={s.row}>
        <div><span style={s.bold}>Cliente:</span> {order.client_name || "—"}</div>
        <div style={{ textAlign: "right" }}>
          <div><span style={s.bold}>Recibida:</span> {fmtDate(order.order_date)}</div>
          <div><span style={s.bold}>Entrega:</span> {fmtDate(order.delivery_date)} {deliveryTime} <span style={s.bold}>{dayName}</span></div>
        </div>
      </div>

      <hr style={s.hr} />

      <div style={{ ...s.grid4, ...s.bold, borderBottom: "1px solid #000", paddingBottom: "2px", marginBottom: "3px" }}>
        <span>Artículo / Servicio</span><span style={{ textAlign: "center" }}>Cant</span>
        <span style={{ textAlign: "right" }}>P.Unit</span><span style={{ textAlign: "right" }}>Subtotal</span>
      </div>
      {(order.items || []).map((item, i) => (
        <div key={i} style={s.grid4}>
          <span>{item.product_name}{item.service_name ? ` (${item.service_name})` : ""}</span>
          <span style={{ textAlign: "center" }}>{item.quantity}</span>
          <span style={{ textAlign: "right" }}>${parseFloat(item.unit_price || 0).toFixed(2)}</span>
          <span style={{ textAlign: "right" }}>{item.quantity}×${parseFloat(item.unit_price || 0).toFixed(2)}</span>
        </div>
      ))}

      <hr style={s.hr} />

      <div style={s.footer}>
        <div>
          <div><span style={s.bold}>Total piezas:</span> {totalPieces}&nbsp;&nbsp;&nbsp;<span style={s.bold}>Kgs.:</span> 0.00</div>
          {order.created_by_name && <div><span style={s.bold}>Atendido por:</span> {order.created_by_name}</div>}
          <div style={{ marginTop: "4px" }}>
            <span style={s.bold}>A cuenta:</span> ${paid.toFixed(2)}&nbsp;&nbsp;&nbsp;
            <span style={s.bold}>Resta:</span> ${resta > 0 ? resta.toFixed(2) : "0.00"}
          </div>
        </div>
        <div>
          <div style={s.totLine}><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
          {discount > 0 && <div style={s.totLine}><span>Descuento</span><span>-${discount.toFixed(2)}</span></div>}
          <div style={s.totLine}><span>IVA</span><span>${tax.toFixed(2)}</span></div>
          <div style={{ ...s.totLine, ...s.bold, borderTop: "1px solid #000", marginTop: "2px", paddingTop: "2px" }}>
            <span>Total</span><span>${total.toFixed(2)}</span>
          </div>
          {(order.payments || []).map((p, i) => (
            <div key={i} style={{ ...s.totLine, fontSize: "8.5px", color: "#555" }}>
              <span>{{ cash: "Efectivo", card: "Tarjeta", points: "Puntos" }[p.method] || p.method}</span>
              <span>${parseFloat(p.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {order.notes && <div style={{ marginTop: "4px" }}><span style={s.bold}>Notas:</span> {order.notes}</div>}
    </div>
  );
}
