import React from "react";
import { Box, Typography } from "@mui/material";
import DoctorCalendarView from "./DoctorCalendarView";

export default function DoctorSchedule() {
  const token = localStorage.getItem("clinic_token") || localStorage.getItem("access_token");
  let claims = {};
  if (token) {
    try {
      const payload = token.split(".")[1];
      let base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4) {
        base64 += "=";
      }
      claims = JSON.parse(atob(base64));
    } catch (e) {
      claims = JSON.parse(localStorage.getItem("clinic_claims") || localStorage.getItem("user_claims") || "{}");
    }
  }

  const doctor = { id: claims.employee_id };
  const branchId = claims.branch_id || localStorage.getItem("branch_id");

  if (!doctor.id) {
    return <Typography sx={{ p: 3 }}>Error: No se encontró el ID del doctor en la sesión actual.</Typography>;
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>Mi Horario</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Aquí puedes ver tus citas y configurar tus ausencias (bloqueos) o turnos extra.
      </Typography>
      
      <Box sx={{ bgcolor: "white", p: 2, borderRadius: 2, boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
        <DoctorCalendarView doctor={doctor} branchId={branchId} token={token} />
      </Box>
    </Box>
  );
}
