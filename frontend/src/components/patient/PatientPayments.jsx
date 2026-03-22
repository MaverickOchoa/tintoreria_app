import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Box, Typography, Paper, Chip, Skeleton } from "@mui/material";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";

const CLINIC_API = import.meta.env.VITE_CLINIC_API_URL || import.meta.env.VITE_API_URL || "";

export default function PatientPayments() {
  const { token } = useOutletContext();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${CLINIC_API}/clinic/portal/payments`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setPayments(d.payments || []))
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }, [token]);

  const total = payments.filter(p => !p.paid).reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <ReceiptLongIcon sx={{ color: "#4361ee" }} />
        <Typography variant="h6" fontWeight={800}>Mis Adeudos</Typography>
      </Box>

      {total > 0 && (
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: "2px solid #fbbf24", bgcolor: "#fffbeb", mb: 3 }}>
          <Typography fontSize={13} color="#92400e" fontWeight={600}>Saldo pendiente total</Typography>
          <Typography fontSize={28} fontWeight={800} color="#d97706">${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</Typography>
        </Paper>
      )}

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={70} sx={{ borderRadius: 2, mb: 1 }} />)
      ) : payments.length === 0 ? (
        <Typography color="text.secondary" fontSize={14} textAlign="center" mt={6}>No tienes adeudos pendientes.</Typography>
      ) : (
        payments.map(p => (
          <Paper key={p.appointment_id} elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid #e5e7eb", mb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography fontWeight={700} fontSize={14}>{p.service}</Typography>
              <Typography fontSize={12} color="text.secondary">
                {p.date ? new Date(p.date).toLocaleDateString("es-MX", { dateStyle: "medium" }) : "—"}
              </Typography>
            </Box>
            <Box sx={{ textAlign: "right" }}>
              <Typography fontWeight={700} fontSize={15}>${(p.amount || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</Typography>
              <Chip label={p.paid ? "Pagado" : "Pendiente"} size="small"
                sx={{ bgcolor: p.paid ? "#ecfdf5" : "#fef2f2", color: p.paid ? "#059669" : "#dc2626", fontWeight: 700, fontSize: 11 }} />
            </Box>
          </Paper>
        ))
      )}
    </Box>
  );
}
