import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Paper, Typography, Button, TextField,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, Divider, Card, CardActionArea, Chip,
  CircularProgress, Snackbar, Alert, Dialog,
  DialogTitle, DialogContent, DialogActions, Tooltip, InputAdornment,
  Select, MenuItem, FormControl, InputLabel,
  Accordion, AccordionSummary, AccordionDetails, ToggleButtonGroup, ToggleButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import StarsIcon from "@mui/icons-material/Stars";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import LockIcon from "@mui/icons-material/Lock";
import PrintIcon from "@mui/icons-material/Print";
import QrCodeIcon from "@mui/icons-material/QrCode";
import JsBarcode from "jsbarcode";
import OrderReceipt, { usePrintReceipt } from "./OrderReceipt";

const API = import.meta.env.VITE_API_URL || API;
const getClaims = () => { try { return JSON.parse(localStorage.getItem("user_claims") || "{}"); } catch { return {}; } };

const MANAGER_ROLES = new Set(["business_admin", "branch_manager"]);

const generateFolio = () => {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}-${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}`;
};

function PrintTicketsModal({ order, onClose }) {
  const tickets = order?.garment_tickets || [];
  const folio = order?.folio || "";
  const token = localStorage.getItem("access_token");
  const claims = getClaims();
  const printReceipt = usePrintReceipt();

  const [businessInfo, setBusinessInfo] = useState(null);
  const [businessHours, setBusinessHours] = useState([]);

  useEffect(() => {
    if (claims.business_id) {
      fetch(`${API}/businesses/${claims.business_id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => setBusinessInfo(d)).catch(() => {});
      fetch(`${API}/api/v1/businesses/${claims.business_id}/hours`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => setBusinessHours(Array.isArray(d) ? d : (d.hours || []))).catch(() => {});
    }
  }, []);

  useEffect(() => {
    tickets.forEach((t, idx) => {
      const el = document.getElementById(`bc-${idx}`);
      if (el) {
        try {
          JsBarcode(el, t.ticket_code, {
            format: "CODE128", displayValue: true,
            fontSize: 9, height: 28, width: 1.5, margin: 2,
          });
        } catch (e) { console.error(e); }
      }
    });
  }, [tickets]);

  const handlePrintReceipt = () => printReceipt(order, businessInfo, businessHours);

  const handlePrintTickets = () => {
    const win = window.open("", "_blank", "width=600,height=500");
    if (!win) { alert("Permite ventanas emergentes para imprimir."); return; }

    const ticketHTML = tickets.map((t, idx) => {
      const svgEl = document.getElementById(`bc-${idx}`);
      const barcodeHTML = svgEl
        ? `<div style="margin:1px 0;line-height:0">${svgEl.outerHTML.replace(/width="[^"]*"/, 'width="200px"').replace(/height="[^"]*"/, 'height="22px"')}</div>`
        : `<div style="font-size:9px;font-weight:bold;font-family:monospace">${t.ticket_code}</div>`;

      const orderDate = order.order_date
        ? new Date(order.order_date + (order.order_date.includes("T") ? "" : "T00:00:00"))
        : new Date();
      const dateStr = `${String(orderDate.getMonth()+1).padStart(2,"0")}/${String(orderDate.getDate()).padStart(2,"0")}/${orderDate.getFullYear()}`;
      const timeStr = order.order_time || orderDate.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

      return `<div class="ticket">
        <div style="font-size:11px;font-weight:bold;text-transform:uppercase;line-height:1.2">${order.client_name || "—"}</div>
        <div style="font-size:8px">Atendió: ${order.created_by_name || "—"} &nbsp; ${dateStr} &nbsp; ${timeStr}</div>
        <div style="font-size:8.5px">${t.quantity_index && t.total_quantity ? `${t.quantity_index}` : "1"} ${t.item_name}${t.color ? "  " + t.color : ""}</div>
        <div style="font-size:8px">Precio $${parseFloat(t.unit_price || 0).toFixed(2)} &nbsp; Pagos: $${parseFloat(order.amount_paid || 0).toFixed(2)}</div>
        ${barcodeHTML}
        <div style="font-size:10px;font-weight:bold;letter-spacing:1px;margin-top:1px">${order.folio || order.id} &nbsp;&nbsp; Ticket ${t.quantity_index} de ${t.total_quantity || tickets.length} &nbsp;&nbsp; ${order.folio || order.id}</div>
      </div>`;
    }).join("");

    win.document.open();
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        @page{size:3in 1.5in;margin:0}
        body{font-family:'Courier New',Courier,monospace;background:#fff;color:#000}
        .ticket{
          width:3in;height:1.5in;
          padding:3px 5px;
          display:flex;flex-direction:column;justify-content:center;align-items:center;
          text-align:center;overflow:hidden;
          page-break-after:always;
        }
        .ticket:last-child{page-break-after:auto}
      </style>
    </head><body>${ticketHTML}</body></html>`);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  };

  return (
    <>
      {/* Hidden ticket SVGs for capture */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        {tickets.map((t, idx) => (
          <svg key={t.id} id={`bc-${idx}`} />
        ))}
      </div>

      <Dialog open maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <QrCodeIcon /> Orden creada — Nota {folio}
        </DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            ¡Orden creada exitosamente! Se generaron {tickets.length} ticket(s) de prenda.
          </Alert>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Imprime la nota (2 copias en hoja carta) y los tickets de prendas por separado.
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {tickets.map((t, idx) => (
              <Box key={t.id} sx={{ border: "1px solid #ccc", borderRadius: 1, p: 1, textAlign: "center", minWidth: 140 }}>
                <Typography variant="caption" fontWeight="bold" display="block">Nota: {folio}</Typography>
                <Typography variant="caption" display="block">{t.item_name}</Typography>
                <Typography variant="caption" color="text.secondary" display="block">Prenda {t.quantity_index}</Typography>
                <Typography variant="caption" sx={{ fontFamily: "monospace", fontSize: "10px" }}>{t.ticket_code}</Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button startIcon={<PrintIcon />} variant="contained" onClick={handlePrintReceipt}>
            Imprimir Nota (2 copias)
          </Button>
          <Button startIcon={<PrintIcon />} variant="outlined" onClick={handlePrintTickets}>
            Imprimir Tickets
          </Button>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default function CreateOrder() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");
  const claims = getClaims();
  const branchId = claims.branch_id ?? claims.active_branch_id ?? localStorage.getItem("branch_id") ?? null;
  const isManager = MANAGER_ROLES.has(claims.role);

  const folio = useRef(null);
  const [folioDisplay, setFolioDisplay] = useState("Generando...");

  const [client, setClient]         = useState(null);
  const [services, setServices]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems]           = useState([]);
  const [colors, setColors]         = useState([]);
  const [prints, setPrints]         = useState([]);
  const [defects, setDefects]       = useState([]);

  const [prendaCount, setPrendaCount]   = useState(1);
  const [selectedService, setSelectedService]   = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedItem, setSelectedItem]         = useState(null);
  const [selectedPrint, setSelectedPrint]       = useState(null);
  const [selectedDefect, setSelectedDefect]     = useState(null);
  const [currentPrendaIndex, setCurrentPrendaIndex] = useState(0);
  const [prendaConfigs, setPrendaConfigs]           = useState([]);

  const [catDialogOpen, setCatDialogOpen]       = useState(false);
  const [itemDialogOpen, setItemDialogOpen]     = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen]       = useState(false);

  const [cart, setCart]           = useState([]);
  const [discountPct, setDiscountPct] = useState(0);
  const [notes, setNotes]         = useState("");
  const [authCode, setAuthCode]   = useState("");
  const [authError, setAuthError] = useState("");
  const [usesIva, setUsesIva]     = useState(true);
  const [activePromos, setActivePromos] = useState([]);
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [businessConfig, setBusinessConfig] = useState({ payment_cash: true, payment_card: true, payment_points: false, allow_deferred: true, points_per_peso: 1, peso_per_point: 1 });

  // Payment modal state
  const [payInputs, setPayInputs] = useState({ cash: "", card: "", points: "" });
  const [isDeferred, setIsDeferred] = useState(false);
  const [payMethod, setPayMethod] = useState("cash");
  const [overrideTotal, setOverrideTotal] = useState(null);

  const [urgency, setUrgency] = useState("normal");
  const [deliveryDate, setDeliveryDate] = useState(null);
  const [deliveryDateOverride, setDeliveryDateOverride] = useState("");
  const [userEditedDate, setUserEditedDate] = useState(false);

  const [loadingClient, setLoadingClient]   = useState(true);
  const [loadingCats, setLoadingCats]       = useState(false);
  const [loadingItems, setLoadingItems]     = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [error, setError]     = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [printTicketsOpen, setPrintTicketsOpen] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);

  useEffect(() => {
    // Cargar cliente
    fetch(`${API}/api/v1/clients/${clientId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setClient).catch(() => setError("Error al cargar cliente"))
      .finally(() => setLoadingClient(false));

    // Cargar servicios
    fetch(`${API}/services`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setServices(Array.isArray(d) ? d : (d.services || [])))
      .catch(console.error);

    // Obtener folio del backend si hay sucursal
    if (branchId) {
      fetch(`${API}/branches/${branchId}/folio`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { folio.current = d.folio; setFolioDisplay(d.folio); })
        .catch(() => { folio.current = generateFolio(); setFolioDisplay(folio.current); });
    } else {
      folio.current = generateFolio();
      setFolioDisplay(folio.current);
    }
    // Cargar config IVA y pagos del branch (no del negocio)
    if (branchId) {
      fetch(`${API}/branches/${branchId}/config`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          if (d.uses_iva !== undefined) setUsesIva(d.uses_iva);
          setBusinessConfig({
            payment_cash: d.payment_cash ?? true,
            payment_card: d.payment_card ?? true,
            payment_points: d.payment_points ?? false,
            allow_deferred: d.allow_deferred ?? true,
            points_per_peso: d.points_per_peso ?? 1,
            peso_per_point: d.peso_per_point ?? 1,
            normal_days: d.normal_days ?? 3,
            urgent_days: d.urgent_days ?? 1,
            extra_urgent_days: d.extra_urgent_days ?? 0,
            urgent_pct: d.urgent_pct ?? 20,
            extra_urgent_pct: d.extra_urgent_pct ?? 50,
            discount_enabled: d.discount_enabled ?? true,
            max_discount_pct: d.max_discount_pct ?? 50,
          });
        })
        .catch(console.error);
    } else if (claims.business_id) {
      fetch(`${API}/businesses/${claims.business_id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          if (d.uses_iva !== undefined) setUsesIva(d.uses_iva);
          setBusinessConfig({
            payment_cash: d.payment_cash ?? true,
            payment_card: d.payment_card ?? true,
            payment_points: d.payment_points ?? false,
            allow_deferred: d.allow_deferred ?? true,
            points_per_peso: d.points_per_peso ?? 1,
            peso_per_point: d.peso_per_point ?? 1,
            normal_days: d.normal_days ?? 3,
            urgent_days: d.urgent_days ?? 1,
            extra_urgent_days: d.extra_urgent_days ?? 0,
            urgent_pct: d.urgent_pct ?? 20,
            extra_urgent_pct: d.extra_urgent_pct ?? 50,
            discount_enabled: d.discount_enabled ?? true,
            max_discount_pct: d.max_discount_pct ?? 50,
          });
        })
        .catch(console.error);
    }
    fetch(`${API}/api/v1/promotions?active_only=1`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => setActivePromos(d.promotions || []))
        .catch(console.error);
  }, [clientId, token]);

  // Multiplicador de precio según urgencia
  const getUrgencyMultiplier = (u) => {
    if (u === "urgent")       return 1 + (businessConfig.urgent_pct || 0) / 100;
    if (u === "extra_urgent") return 1 + (businessConfig.extra_urgent_pct || 0) / 100;
    return 1;
  };

  // Recalcular precios del carrito cuando cambia la urgencia
  const handleUrgencyChange = (newUrgency) => {
    const oldMult = getUrgencyMultiplier(urgency);
    const newMult = getUrgencyMultiplier(newUrgency);
    setCart(prev => prev.map(item => ({
      ...item,
      unit_price: parseFloat((item.unit_price / oldMult * newMult).toFixed(2)),
    })));
    setUrgency(newUrgency);
  };

  // Calcular fecha de entrega estimada al cambiar urgencia (solo si el usuario no la editó)
  useEffect(() => {
    if (userEditedDate) return;
    const daysMap = { normal: businessConfig.normal_days || 3, urgent: businessConfig.urgent_days || 1, extra_urgent: businessConfig.extra_urgent_days || 0 };
    const days = daysMap[urgency];
    let d = new Date();
    let added = 0;
    while (added < days) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0) added++;
    }
    setDeliveryDate(d.toISOString());
    setDeliveryDateOverride(d.toISOString().slice(0, 16));
  }, [urgency, businessConfig.normal_days, businessConfig.urgent_days, businessConfig.extra_urgent_days, userEditedDate]);

  const handleServiceClick = async (svc) => {
    setSelectedService(svc);
    setSelectedCategory(null);
    setCategories([]);
    setLoadingCats(true);
    setCatDialogOpen(true);
    try {
      const res = await fetch(`${API}/services/${svc.id}/categories`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      setCategories(d.categories || []);
    } catch { setError("Error al cargar categorías"); }
    finally { setLoadingCats(false); }
  };

  const handleCategoryClick = async (cat) => {
    setSelectedCategory(cat);
    setItems([]);
    setLoadingItems(true);
    setCatDialogOpen(false);
    setItemDialogOpen(true);
    try {
      const res = await fetch(`${API}/categories/${cat.id}/items`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      setItems(d.items || []);
    } catch { setError("Error al cargar artículos"); }
    finally { setLoadingItems(false); }
  };

  const handleItemClick = async (item) => {
    setSelectedItem(item);
    setSelectedPrint(null);
    setSelectedDefect(null);
    setCurrentPrendaIndex(0);
    setPrendaConfigs([]);
    setItemDialogOpen(false);
    setDetailDialogOpen(true);
    setLoadingDetails(true);
    try {
      const [cRes, pRes, dRes] = await Promise.all([
        fetch(`${API}/api/v1/colors`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/v1/prints`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/v1/defects`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [cData, pData, dData] = await Promise.all([cRes.json(), pRes.json(), dRes.json()]);
      setColors(cData.colors || []);
      setPrints(pData.prints || []);
      setDefects(dData.defects || []);
    } catch { setError("Error al cargar detalles"); }
    finally { setLoadingDetails(false); }
  };

  const handleColorSelect = (color) => {
    const config = {
      color_id: color.id, color_name: color.name, color_hex: color.hex_code,
      print_id: selectedPrint?.id ?? null, print_name: selectedPrint?.name ?? null,
      defect_id: selectedDefect?.id ?? null, defect_name: selectedDefect?.name ?? null,
    };
    const newConfigs = [...prendaConfigs, config];
    const nextIndex = currentPrendaIndex + 1;

    if (nextIndex < prendaCount) {
      setPrendaConfigs(newConfigs);
      setCurrentPrendaIndex(nextIndex);
      setSelectedPrint(null);
      setSelectedDefect(null);
    } else {
      setCart(prev => {
        let updated = [...prev];
        for (const cfg of newConfigs) {
          const matchKey = `${selectedItem.id}-${cfg.color_id}-${cfg.print_id ?? 0}-${cfg.defect_id ?? 0}`;
          const found = updated.find(i => i.matchKey === matchKey);
          if (found) {
            updated = updated.map(i => i.matchKey === matchKey ? { ...i, quantity: i.quantity + 1 } : i);
          } else {
            updated = [...updated, {
              cartKey: `${matchKey}-${Date.now()}-${Math.random()}`,
              matchKey,
              product_service_id: selectedItem.id,
              item_id: selectedItem.id,
              service_id: selectedService?.id ?? null,
              name: selectedItem.name,
              service_name: selectedService?.name ?? "",
              unit_price: parseFloat((selectedItem.price * getUrgencyMultiplier(urgency)).toFixed(2)),
              quantity: 1,
              ...cfg,
            }];
          }
        }
        return updated;
      });
      setDetailDialogOpen(false);
      setSelectedItem(null);
      setSelectedPrint(null);
      setSelectedDefect(null);
      setPrendaConfigs([]);
      setCurrentPrendaIndex(0);
    }
  };

  const removeFromCart = (cartKey) => setCart(prev => prev.filter(i => i.cartKey !== cartKey));
  const updateQty = (cartKey, delta) => setCart(prev =>
    prev.map(i => i.cartKey === cartKey ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i)
  );

  const subtotal      = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  // ─── Motor de promociones (múltiples promos por nota) ───
  const evaluatePromos = (currentCart) => {
    const appliedPromos = [];
    let totalPromoDiscount = 0;
    let allGiftAdditions = [];

    for (const promo of activePromos) {
      let bundleCount = Infinity;
      for (const req of promo.required_lines) {
        const inCart = currentCart.filter(item =>
          (!req.item_id || parseInt(item.item_id) === parseInt(req.item_id)) &&
          (!promo.service_id || parseInt(item.service_id) === parseInt(promo.service_id))
        );
        const totalQty = inCart.reduce((s, i) => s + i.quantity, 0);
        bundleCount = Math.min(bundleCount, Math.floor(totalQty / req.quantity));
      }
      if (bundleCount === Infinity || bundleCount === 0) continue;

      if (promo.promo_type === "bundle_price" && promo.bundle_price != null) {
        let normalPricePerBundle = 0;
        for (const req of promo.required_lines) {
          const item = currentCart.find(i =>
            (!req.item_id || parseInt(i.item_id) === parseInt(req.item_id)) &&
            (!promo.service_id || parseInt(i.service_id) === parseInt(promo.service_id))
          );
          normalPricePerBundle += (item?.unit_price || 0) * req.quantity;
        }
        const saving = bundleCount * normalPricePerBundle - bundleCount * parseFloat(promo.bundle_price);
        if (saving > 0) {
          appliedPromos.push({ ...promo, saving, bundleDiscount: saving, bundleCount });
          totalPromoDiscount += saving;
        }
      } else if (promo.promo_type === "buy_get_free") {
        const freeValue = bundleCount * (promo.reward_lines || []).reduce((s, rl) => {
          const item = currentCart.find(i => parseInt(i.item_id) === parseInt(rl.item_id));
          return s + ((item?.unit_price || 0) * rl.quantity);
        }, 0);
        if (freeValue > 0) {
          appliedPromos.push({ ...promo, saving: freeValue });
          totalPromoDiscount += freeValue;
          const gifts = (promo.reward_lines || []).map(rl => ({
            item_id: rl.item_id, item_name: rl.item_name, quantity: bundleCount * rl.quantity,
            unit_price: 0, service_name: promo.service_name || "",
            service_id: promo.service_id, is_gift: true,
            cartKey: `gift-${promo.id}-${rl.item_id}`,
          }));
          allGiftAdditions = [...allGiftAdditions, ...gifts];
        }
      }
    }
    return { appliedPromos, allGiftAdditions, totalPromoDiscount };
  };

  const { appliedPromos, allGiftAdditions, totalPromoDiscount } = evaluatePromos(cart);
  const cartWithGifts = allGiftAdditions.length > 0
    ? [...cart.filter(i => !i.is_gift), ...allGiftAdditions]
    : cart;
  const effectiveSubtotal = Math.max(0, subtotal - totalPromoDiscount);
  const discountAmt   = effectiveSubtotal * (Math.min(100, Math.max(0, discountPct)) / 100);
  const taxableBase   = Math.max(0, effectiveSubtotal - discountAmt);
  const tax           = usesIva ? taxableBase * 0.16 : 0;
  const total         = taxableBase + tax;
  const totalSaving   = totalPromoDiscount + discountAmt;
  const needsAuthCode = !isManager && discountPct > 50;

  const handleSubmitOrder = () => {
    if (cart.length === 0) { setError("El carrito está vacío."); return; }
    if (needsAuthCode && !authCode.trim()) { setAuthError("Ingresa el código de autorización del gerente."); return; }
    setPayInputs({ cash: "", card: "", points: "" });
    setIsDeferred(false);
    setPayDialogOpen(true);
  };

  const confirmPayAndSubmit = async (overrides = {}) => {
    const inputs = { ...payInputs, ...overrides };
    const deferred = overrides.isDeferred !== undefined ? overrides.isDeferred : isDeferred;
    const cashAmt   = parseFloat(inputs.cash  || "0");
    const cardAmt   = parseFloat(inputs.card  || "0");
    const pointsAmt = parseFloat(inputs.points || "0");
    const pointsMonetary = pointsAmt * businessConfig.peso_per_point;

    const nonCashTotal = cardAmt + pointsMonetary;
    const cashApplied = Math.min(cashAmt, Math.max(0, total - nonCashTotal));

    const payments = [];
    if (cashApplied > 0) payments.push({ method: "cash",   amount: parseFloat(cashApplied.toFixed(2)) });
    if (cardAmt   > 0)   payments.push({ method: "card",   amount: cardAmt });
    if (pointsAmt > 0)   payments.push({ method: "points", amount: parseFloat(pointsMonetary.toFixed(2)), points_used: pointsAmt });

    if (!deferred && payments.length === 0) {
      setError("Selecciona al menos un método de pago o marca como pago posterior."); return;
    }

    setPayDialogOpen(false);
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/v1/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          client_id: parseInt(clientId),
          branch_id: branchId ? parseInt(branchId) : null,
          notes,
          urgency,
          delivery_date: deliveryDateOverride || deliveryDate,
          discount_amount: parseFloat(discountAmt.toFixed(2)),
          promo_discount: parseFloat(totalPromoDiscount.toFixed(2)),
          discount_pct: parseFloat(discountPct),
          auth_code: needsAuthCode ? authCode : undefined,
          is_deferred: deferred,
          payments,
          items: cart.map(i => ({
            product_service_id: i.product_service_id,
            quantity: i.quantity,
            unit_price: i.unit_price,
            color_id: i.color_id,
            print_id: i.print_id,
            defect_id: i.defect_id,
          })),
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setCreatedOrder(d.order);
        setPrintTicketsOpen(true);
      } else setError(d.message || "Error al crear la orden.");
    } catch { setError("Error de conexión."); }
    finally { setSubmitting(false); }
  };

  if (loadingClient) return <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}><CircularProgress /></Box>;
  if (!client) return <Box sx={{ p: 4 }}><Alert severity="error">Cliente no encontrado.</Alert></Box>;

  return (
    <Box sx={{ width: "calc(100% + 48px)", height: { xs: "auto", md: "calc(100vh - 64px)" }, minHeight: { xs: "100dvh", md: "unset" }, ml: { xs: -2, md: -3 }, mr: { xs: -2, md: -3 }, mt: -3, display: "flex", flexDirection: "column", overflow: { xs: "auto", md: "hidden" }, bgcolor: "#f0f2f5" }}>

      {/* HEADER */}
      <Paper elevation={3} square sx={{ px: 3, py: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button startIcon={<ArrowBackIcon />} size="small" onClick={() => navigate("/clients")}>Volver</Button>
          <Typography variant="h6" fontWeight="bold">
            Nueva Orden — {client.full_name}{client.last_name ? ` ${client.last_name}` : ""}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">{client.phone}</Typography>
      </Paper>

      {/* BODY */}
      <Box sx={{ flex: 1, display: "flex", overflow: { xs: "visible", md: "hidden" }, minHeight: 0, flexDirection: { xs: "column", md: "row" } }}>

        {/* LEFT 20% — Folio + Prendas + Servicios */}
        <Box sx={{ width: { xs: "100%", md: "20%" }, display: "flex", flexDirection: "column", borderRight: { md: "1px solid #ddd" }, borderBottom: { xs: "1px solid #ddd", md: "none" }, bgcolor: "#fff" }}>

          {/* Folio */}
          <Box sx={{ px: 2, py: 1.2, borderBottom: "1px solid #eee", bgcolor: "#f5f5f5" }}>
            <Typography variant="caption" color="text.secondary" display="block">NÚMERO DE NOTA</Typography>
            <Typography variant="subtitle1" fontWeight="bold" color="primary">{folioDisplay}</Typography>
          </Box>

          {/* Urgencia y fecha de entrega */}
          <Box sx={{ px: 2, py: 1.2, borderBottom: "1px solid #eee" }}>
            <FormControl size="small" fullWidth sx={{ mb: 1 }}>
              <InputLabel>Tipo de servicio</InputLabel>
              <Select value={urgency} label="Tipo de servicio" onChange={e => handleUrgencyChange(e.target.value)}>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="urgent">Urgente</MenuItem>
                <MenuItem value="extra_urgent">Extra urgente</MenuItem>
              </Select>
            </FormControl>
            <TextField type="datetime-local" size="small" fullWidth
              value={deliveryDateOverride}
              onChange={e => { setDeliveryDateOverride(e.target.value); setUserEditedDate(true); }}
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          {/* Contador prendas */}
          <Box sx={{ px: 2, py: 1.2, borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="subtitle2" fontWeight="bold">Prendas</Typography>
            <Box display="flex" alignItems="center" gap={0.5}>
              <IconButton size="small" onClick={() => setPrendaCount(c => Math.max(1, c - 1))} sx={{ border: "1px solid #ddd" }}>
                <RemoveIcon sx={{ fontSize: 14 }} />
              </IconButton>
              <Typography variant="h6" fontWeight="bold" sx={{ minWidth: 28, textAlign: "center" }}>{prendaCount}</Typography>
              <IconButton size="small" onClick={() => setPrendaCount(c => c + 1)} sx={{ border: "1px solid #ddd" }}>
                <AddIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          </Box>

          <Box sx={{ px: 2, py: 0.8, borderBottom: "1px solid #eee" }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold">SERVICIOS</Typography>
          </Box>

          {/* Servicios 2 columnas */}
          <Box sx={{ flex: 1, overflowY: "auto", p: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, alignContent: "start" }}>
            {services.map(svc => (
              <Card key={svc.id} onClick={() => handleServiceClick(svc)} elevation={selectedService?.id === svc.id ? 4 : 1}
                sx={{ cursor: "pointer", bgcolor: selectedService?.id === svc.id ? "primary.main" : "background.paper",
                  color: selectedService?.id === svc.id ? "#fff" : "text.primary", transition: "all 0.18s", "&:hover": { boxShadow: 3 } }}>
                <CardActionArea sx={{ px: 1, py: 1.5, textAlign: "center" }}>
                  <Typography variant="caption" fontWeight="bold" sx={{ lineHeight: 1.2 }}>{svc.name}</Typography>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        </Box>

        {/* CENTER — Carrito */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Breadcrumb */}
          <Box sx={{ px: 2, py: 0.8, borderBottom: "1px solid #eee", bgcolor: "#fff", display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            {selectedService
              ? <Chip label={selectedService.name} color="primary" size="small" onClick={() => setCatDialogOpen(true)} sx={{ cursor: "pointer" }} />
              : <Typography variant="body2" color="text.secondary">← Selecciona un servicio</Typography>}
            {selectedCategory && (<>
              <Typography variant="body2" color="text.secondary">›</Typography>
              <Chip label={selectedCategory.name} color="secondary" size="small" onClick={() => setItemDialogOpen(true)} sx={{ cursor: "pointer" }} />
            </>)}
          </Box>

          <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
            {cart.length === 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.45 }}>
                <ShoppingCartIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
                <Typography color="text.secondary">El carrito está vacío. Selecciona un servicio para comenzar.</Typography>
              </Box>
            ) : (
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" mb={1} display="flex" alignItems="center" gap={1}>
                  <ShoppingCartIcon fontSize="small" />
                  Artículos
                  <Chip label={cart.reduce((s, i) => s + i.quantity, 0)} size="small" color="primary" />
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <List dense disablePadding>
                  {cart.map(item => (
                    <React.Fragment key={item.cartKey}>
                      <ListItem sx={{ px: 0, alignItems: "flex-start" }}>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                              <Typography variant="body2" fontWeight="bold">{item.name}</Typography>
                              {item.service_name && <Chip label={item.service_name} size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: 10 }} />}
                              {item.color_hex
                                ? <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: item.color_hex, border: "1px solid #ccc" }} />
                                : null}
                              <Typography variant="caption" color="text.secondary">{item.color_name}</Typography>
                              {item.print_name && <Chip label={item.print_name} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />}
                              {item.defect_name && <Chip label={item.defect_name} size="small" color="warning" variant="outlined" sx={{ height: 18, fontSize: 10 }} />}
                            </Box>
                          }
                          secondary={`$${item.unit_price.toFixed(2)} × ${item.quantity} = $${(item.unit_price * item.quantity).toFixed(2)}`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton size="small" onClick={() => updateQty(item.cartKey, -1)}><RemoveIcon sx={{ fontSize: 14 }} /></IconButton>
                          <Typography component="span" variant="body2" sx={{ mx: 0.5 }}>{item.quantity}</Typography>
                          <IconButton size="small" onClick={() => updateQty(item.cartKey, 1)}><AddIcon sx={{ fontSize: 14 }} /></IconButton>
                          <IconButton size="small" color="error" onClick={() => removeFromCart(item.cartKey)}><DeleteIcon sx={{ fontSize: 14 }} /></IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      <Divider component="li" />
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            )}
          </Box>
        </Box>

        {/* RIGHT 15% — Notas + Desglose + Confirm */}
        <Box sx={{ width: { xs: "100%", md: "15%" }, minWidth: { md: 200 }, display: "flex", flexDirection: "column", borderLeft: { md: "1px solid #ddd" }, borderTop: { xs: "1px solid #ddd", md: "none" }, bgcolor: "#fff" }}>

          {/* Notas — ocupa todo el espacio disponible */}
          <Box sx={{ flex: 1, p: 1.5, display: "flex", flexDirection: "column" }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold" mb={0.5}>NOTAS</Typography>
            <TextField
              multiline fullWidth
              placeholder="Observaciones de la orden..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              sx={{ flex: 1, "& .MuiInputBase-root": { height: "100%", alignItems: "flex-start" }, "& textarea": { height: "100% !important" } }}
              InputProps={{ sx: { height: "100%" } }}
            />
          </Box>

          <Divider />

          {/* Desglose */}
          <Box sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">Subtotal</Typography>
              <Typography variant="body2">${subtotal.toFixed(2)}</Typography>
            </Box>

            {/* Promos aplicadas */}
            {appliedPromos.map(promo => (
              <Box key={promo.id} display="flex" alignItems="center"
                sx={{ bgcolor: "success.light", borderRadius: 1, px: 1, py: 0.5 }}>
                <Typography variant="caption" color="success.dark" fontWeight={600} noWrap>
                  🎉 {promo.title}
                </Typography>
              </Box>
            ))}

            {/* Descuento % — solo si está habilitado en el branch */}
            {businessConfig.discount_enabled && (
              <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
                <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>Desc.</Typography>
                <TextField
                  type="number" size="small" value={discountPct}
                  onChange={e => { setDiscountPct(parseFloat(e.target.value) || 0); setAuthCode(""); setAuthError(""); }}
                  inputProps={{ min: 0, max: 100, step: 1 }}
                  InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                  sx={{ width: 80 }}
                />
              </Box>
            )}
            {businessConfig.discount_enabled && discountPct > 0 && (
              <Box display="flex" justifyContent="space-between">
                <Typography variant="caption" color="success.main">-${discountAmt.toFixed(2)}</Typography>
              </Box>
            )}

            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">IVA {usesIva ? "16%" : "(no aplica)"}</Typography>
              <Typography variant="body2">${tax.toFixed(2)}</Typography>
            </Box>

            <Divider />

            {totalSaving > 0 && (
              <Box display="flex" justifyContent="space-between" alignItems="center"
                sx={{ bgcolor: "success.light", borderRadius: 1, px: 1, py: 0.5 }}>
                <Typography variant="body2" color="success.dark" fontWeight={700}>
                  💰 Ahorraste
                </Typography>
                <Typography variant="body2" color="success.dark" fontWeight={700}>
                  ${totalSaving.toFixed(2)}
                </Typography>
              </Box>
            )}

            {/* Botón usar puntos */}
            {businessConfig.payment_points && client && (client.points_balance || 0) > 0 && (() => {
              const ptsPesos = (client.points_balance || 0) * (businessConfig.peso_per_point || 1);
              return (
                <Button size="small" variant="outlined" color="secondary" startIcon={<StarsIcon />}
                  onClick={() => {
                    const pointsToUse = client.points_balance || 0;
                    const pointsValue = pointsToUse * (businessConfig.peso_per_point || 1);
                    if (pointsValue >= total) {
                      confirmPayAndSubmit({ points: String(pointsToUse), cash: "", card: "", isDeferred: false });
                    } else {
                      const remaining = parseFloat((total - pointsValue).toFixed(2));
                      setPayInputs({ cash: "", card: "", points: String(pointsToUse) });
                      setPayMethod("mixed");
                      setOverrideTotal(remaining);
                      setPayDialogOpen(true);
                    }
                  }}
                  sx={{ textTransform: "none", fontSize: 11 }}>
                  Pagar con puntos: ${ptsPesos.toFixed(2)} disponibles
                </Button>
              );
            })()}

            <Box display="flex" justifyContent="space-between">
              <Typography variant="subtitle2" fontWeight="bold">Total</Typography>
              <Typography variant="subtitle2" fontWeight="bold" color="primary">${total.toFixed(2)}</Typography>
            </Box>

            {/* Código de autorización si descuento > 50% y no es gerente */}
            {needsAuthCode && (
              <TextField
                label="Código gerente"
                type="password"
                size="small"
                fullWidth
                value={authCode}
                onChange={e => { setAuthCode(e.target.value); setAuthError(""); }}
                error={!!authError}
                helperText={authError || "Descuento >50% requiere autorización"}
                InputProps={{ startAdornment: <InputAdornment position="start"><LockIcon sx={{ fontSize: 16 }} /></InputAdornment> }}
              />
            )}

            <Button
              variant="contained" color="success" fullWidth
              onClick={handleSubmitOrder}
              disabled={submitting || cart.length === 0 || (needsAuthCode && !authCode.trim())}
              sx={{ mt: 0.5 }}
            >
              {submitting ? <CircularProgress size={18} color="inherit" /> : "Confirmar Orden"}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* MODAL: Categorías */}
      <Dialog open={catDialogOpen} onClose={() => setCatDialogOpen(false)} maxWidth={false}
        fullWidth PaperProps={{ sx: { width: "80vw", maxWidth: "80vw" } }}>
        <DialogTitle>Categorías — {selectedService?.name}</DialogTitle>
        <DialogContent>
          {loadingCats ? <Box textAlign="center" py={4}><CircularProgress /></Box>
          : categories.length === 0 ? <Typography color="text.secondary" textAlign="center" py={2}>Sin categorías disponibles.</Typography>
          : <Box display="flex" flexWrap="wrap" gap={1.5} pt={1}>
              {categories.map(cat => (
                <Card key={cat.id} onClick={() => handleCategoryClick(cat)}
                  sx={{ minWidth: 130, cursor: "pointer", "&:hover": { boxShadow: 5 }, transition: "box-shadow 0.2s" }}>
                  <CardActionArea sx={{ p: 2, textAlign: "center" }}>
                    <Typography variant="subtitle1" fontWeight="bold">{cat.name}</Typography>
                  </CardActionArea>
                </Card>
              ))}
            </Box>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCatDialogOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: Artículos */}
      <Dialog open={itemDialogOpen} onClose={() => setItemDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedService?.name} › {selectedCategory?.name}</DialogTitle>
        <DialogContent>
          {loadingItems ? <Box textAlign="center" py={4}><CircularProgress /></Box>
          : items.length === 0 ? <Typography color="text.secondary" textAlign="center" py={2}>Sin artículos en esta categoría.</Typography>
          : <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 1.5, pt: 1 }}>
              {items.map(item => (
                <Card key={item.id} onClick={() => handleItemClick(item)}
                  sx={{ cursor: "pointer", "&:hover": { boxShadow: 5, transform: "translateY(-2px)" }, transition: "all 0.2s" }}>
                  <CardActionArea sx={{ p: 1.5 }}>
                    <Typography variant="body2" fontWeight="bold" noWrap>{item.name}</Typography>
                    <Typography variant="subtitle2" color="primary" fontWeight="bold">${parseFloat(item.price).toFixed(2)}</Typography>
                  </CardActionArea>
                </Card>
              ))}
            </Box>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setItemDialogOpen(false); setCatDialogOpen(true); }}>← Categorías</Button>
          <Button onClick={() => setItemDialogOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: Detalles prenda */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth={false}
        fullWidth PaperProps={{ sx: { width: "95vw", height: "95vh", maxWidth: "95vw", display: "flex", flexDirection: "column" } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" fontWeight="bold">{selectedItem?.name}</Typography>
              <Typography variant="caption" color="text.secondary">${selectedItem ? parseFloat(selectedItem.price).toFixed(2) : "0.00"} c/u</Typography>
            </Box>
            <Alert severity="info" sx={{ py: 0.2, px: 1.5 }}>
              Prenda {currentPrendaIndex + 1} de {prendaCount} — selecciona el color para confirmar
            </Alert>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", gap: 2, py: 2 }}>
          {loadingDetails ? <Box textAlign="center" py={6}><CircularProgress /></Box> : (<>

            {/* Estampados y Defectos — colapsable */}
            <Accordion disableGutters elevation={0} sx={{ border: "1px solid #e0e0e0", borderRadius: 1, flexShrink: 0, "&:before": { display: "none" } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 40, "& .MuiAccordionSummary-content": { my: 0.5 } }}>
                <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">
                  ESTAMPADO Y DEFECTO
                  {(selectedPrint || selectedDefect) && (
                    <Typography component="span" variant="caption" color="primary" sx={{ ml: 1 }}>
                      {[selectedPrint?.name, selectedDefect?.name].filter(Boolean).join(" · ")}
                    </Typography>
                  )}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  <Box>
                    <Typography variant="caption" fontWeight="bold" color="text.secondary" mb={0.5} display="block">
                      ESTAMPADO <span style={{ fontWeight: 400 }}>(opcional)</span>
                    </Typography>
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 1 }}>
                      {prints.length === 0
                        ? <Typography variant="caption" color="text.secondary">Sin estampados</Typography>
                        : prints.map(p => (
                          <Button key={p.id} variant={selectedPrint?.id === p.id ? "contained" : "outlined"} size="small"
                            onClick={() => setSelectedPrint(prev => prev?.id === p.id ? null : p)}
                            sx={{ justifyContent: "center", textTransform: "none", height: 32, fontSize: 11 }}>
                            {p.name}
                          </Button>
                        ))}
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight="bold" color="text.secondary" mb={0.5} display="block">
                      DEFECTO <span style={{ fontWeight: 400 }}>(opcional)</span>
                    </Typography>
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 1 }}>
                      {defects.length === 0
                        ? <Typography variant="caption" color="text.secondary">Sin defectos</Typography>
                        : defects.map(d => (
                          <Button key={d.id} variant={selectedDefect?.id === d.id ? "contained" : "outlined"} color="warning" size="small"
                            onClick={() => setSelectedDefect(prev => prev?.id === d.id ? null : d)}
                            sx={{ justifyContent: "center", textTransform: "none", height: 32, fontSize: 11 }}>
                            {d.name}
                          </Button>
                        ))}
                    </Box>
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>

            <Divider flexItem />

            <Box sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <Typography variant="subtitle2" fontWeight="bold" mb={1.5}>
                COLOR <Typography component="span" variant="caption" color="error">(requerido — haz clic para agregar al carrito)</Typography>
              </Typography>
              <Box sx={{ flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 1, alignContent: "start" }}>
                {colors.sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                  <Tooltip key={c.id} title={c.name}>
                    <Box onClick={() => handleColorSelect(c)}
                      sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, cursor: "pointer",
                        p: 1, borderRadius: 1, border: "2px solid transparent",
                        "&:hover": { border: "2px solid", borderColor: "primary.main", bgcolor: "action.hover" }, transition: "all 0.15s" }}>
                      <Box sx={{ width: 36, height: 36, borderRadius: "50%", bgcolor: c.hex_code || "#ccc", border: "2px solid rgba(0,0,0,0.15)", boxShadow: 1 }} />
                      <Typography variant="caption" noWrap sx={{ maxWidth: 68, textAlign: "center", fontSize: 10 }}>{c.name}</Typography>
                    </Box>
                  </Tooltip>
                ))}
              </Box>
            </Box>
          </>)}
        </DialogContent>

        <DialogActions>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1, pl: 2 }}>
            {selectedPrint ? `✓ ${selectedPrint.name}` : "Sin estampado"} · {selectedDefect ? `✓ ${selectedDefect.name}` : "Sin defecto"} · <strong>Selecciona un color para confirmar</strong>
          </Typography>
          <Button onClick={() => { setDetailDialogOpen(false); setItemDialogOpen(true); }}>← Artículos</Button>
          <Button onClick={() => setDetailDialogOpen(false)}>Cancelar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!error} autoHideDuration={5000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      </Snackbar>
      <Snackbar open={!!successMsg} autoHideDuration={4000} onClose={() => setSuccessMsg(null)}>
        <Alert severity="success" onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>
      </Snackbar>

      {/* ─── MODAL DE PAGO ─── */}
      <Dialog open={payDialogOpen} onClose={() => { setPayDialogOpen(false); setOverrideTotal(null); }} maxWidth="xs" fullWidth>
        <DialogTitle>
          {overrideTotal !== null
            ? `Pago restante — $${overrideTotal.toFixed(2)}`
            : `Confirmar pago — $${total.toFixed(2)}`}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>

            {/* Mostrar puntos ya aplicados si viene del botón de puntos */}
            {overrideTotal !== null && payInputs.points && (
              <Box sx={{ bgcolor: "secondary.50", border: "1px solid", borderColor: "secondary.200", borderRadius: 1, px: 2, py: 1 }}>
                <Typography variant="body2" color="secondary.main" fontWeight={600}>
                  Puntos aplicados: {payInputs.points} pts = ${(parseFloat(payInputs.points) * (businessConfig.peso_per_point || 1)).toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Resta por pagar: ${overrideTotal.toFixed(2)}
                </Typography>
              </Box>
            )}

            {/* Selector de método */}
            <ToggleButtonGroup
              value={payMethod} exclusive size="small" fullWidth
              onChange={(_, v) => { if (v) { setPayMethod(v); setPayInputs({ cash: "", card: "", points: "" }); } }}
            >
              {businessConfig.payment_cash && <ToggleButton value="cash">Efectivo</ToggleButton>}
              {businessConfig.payment_card && <ToggleButton value="card">Tarjeta</ToggleButton>}
              {(businessConfig.payment_cash && businessConfig.payment_card) && <ToggleButton value="mixed">Mixto</ToggleButton>}
              {businessConfig.payment_points && client && (client.points_balance || 0) > 0 && <ToggleButton value="points">Puntos</ToggleButton>}
              {businessConfig.allow_deferred && <ToggleButton value="deferred">Posterior</ToggleButton>}
            </ToggleButtonGroup>

            {/* Efectivo */}
            {payMethod === "cash" && (
              <TextField label="Monto recibido ($)" type="number" size="small" fullWidth autoFocus
                value={payInputs.cash}
                onChange={e => setPayInputs(p => ({ ...p, cash: e.target.value }))}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              />
            )}

            {/* Tarjeta — sin casilla, se carga el total automático */}
            {payMethod === "card" && (
              <Box sx={{ bgcolor: "grey.100", borderRadius: 1, p: 1.5, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">Monto a cobrar en tarjeta</Typography>
                <Typography variant="h5" fontWeight="bold" color="primary">${total.toFixed(2)}</Typography>
              </Box>
            )}

            {/* Mixto */}
            {payMethod === "mixed" && (<>
              <TextField label="Efectivo ($)" type="number" size="small" fullWidth
                value={payInputs.cash}
                onChange={e => setPayInputs(p => ({ ...p, cash: e.target.value }))}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              />
              <TextField label="Tarjeta ($)" type="number" size="small" fullWidth
                value={payInputs.card}
                onChange={e => {
                  const c = parseFloat(payInputs.cash || 0);
                  const displayTotal = overrideTotal !== null ? overrideTotal : total;
                  const maxCard = Math.max(0, displayTotal - c);
                  const v = Math.min(parseFloat(e.target.value || 0), maxCard);
                  setPayInputs(p => ({ ...p, card: v > 0 ? String(v) : "" }));
                }}
                helperText="No puede exceder el saldo restante"
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              />
            </>)}

            {/* Puntos */}
            {payMethod === "points" && (
              <TextField
                label={`Puntos a canjear (disponibles: ${(client?.points_balance || 0).toFixed(0)})`}
                type="number" size="small" fullWidth
                value={payInputs.points}
                onChange={e => setPayInputs(p => ({ ...p, points: e.target.value }))}
                helperText={`1 punto = $${businessConfig.peso_per_point}. Valor: $${((parseFloat(payInputs.points || 0)) * businessConfig.peso_per_point).toFixed(2)}`}
              />
            )}

            {/* Pago posterior */}
            {payMethod === "deferred" && (
              <Box sx={{ bgcolor: "warning.light", borderRadius: 1, p: 1.5, textAlign: "center" }}>
                <Typography variant="body2" color="warning.dark" fontWeight="bold">
                  La orden quedará pendiente de pago
                </Typography>
                <Typography variant="caption" color="warning.dark">
                  Se cobrará al momento de entrega
                </Typography>
              </Box>
            )}

            {/* Resumen */}
            {(() => {
              const displayTotal = overrideTotal !== null ? overrideTotal : total;
              const c = payMethod === "cash" ? parseFloat(payInputs.cash || 0)
                      : payMethod === "mixed" ? parseFloat(payInputs.cash || 0) : 0;
              const k = payMethod === "card" ? displayTotal
                      : payMethod === "mixed" ? parseFloat(payInputs.card || 0) : 0;
              const pts = payMethod === "points" ? parseFloat(payInputs.points || 0) * businessConfig.peso_per_point : 0;
              const paid = c + k + pts;
              const remaining = displayTotal - paid;
              const change = payMethod === "cash" && c > displayTotal ? c - displayTotal : 0;
              if (payMethod === "deferred") return null;
              return (
                <Box sx={{ bgcolor: "grey.100", borderRadius: 1, p: 1.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Total</Typography>
                    <Typography variant="body2" fontWeight="bold">${total.toFixed(2)}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Pagado</Typography>
                    <Typography variant="body2">${paid.toFixed(2)}</Typography>
                  </Box>
                  <Divider sx={{ my: 0.5 }} />
                  {change > 0.009 ? (
                    <Box display="flex" justifyContent="space-between" sx={{ bgcolor: "success.light", borderRadius: 1, px: 1, py: 0.5 }}>
                      <Typography variant="body2" fontWeight="bold" color="success.dark">Cambio a dar</Typography>
                      <Typography variant="body2" fontWeight="bold" color="success.dark">${change.toFixed(2)}</Typography>
                    </Box>
                  ) : remaining > 0.01 ? (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="warning.main">Falta por pagar</Typography>
                      <Typography variant="body2" color="warning.main">${remaining.toFixed(2)}</Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="success.main" fontWeight="bold" textAlign="center">✓ Pago completo</Typography>
                  )}
                </Box>
              );
            })()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setPayDialogOpen(false); setOverrideTotal(null); }}>Cancelar</Button>
          <Button variant="contained" onClick={() => {
            const deferred = payMethod === "deferred";
            const displayTotal = overrideTotal !== null ? overrideTotal : total;
            const cardAmt = payMethod === "card" ? String(displayTotal) : payInputs.card;
            confirmPayAndSubmit({ ...payInputs, card: cardAmt, isDeferred: deferred });
          }} disabled={submitting}>
            {submitting ? <CircularProgress size={18} /> : "Confirmar orden"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL IMPRESIÓN DE TICKETS */}
      {printTicketsOpen && createdOrder && (
        <PrintTicketsModal
          order={createdOrder}
          onClose={() => { setPrintTicketsOpen(false); navigate("/orders"); }}
        />
      )}

    </Box>
  );
}
