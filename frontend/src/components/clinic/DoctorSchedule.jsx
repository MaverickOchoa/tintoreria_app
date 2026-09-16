import React from "react";
import { Box, Typography, Button } from "@mui/material";
import DoctorCalendarView from "./DoctorCalendarView";
import DoctorScheduleModal from "./DoctorScheduleModal";

export default function DoctorSchedule() {
  const token = localStorage.getItem("clinic_token") || localStorage.getItem("access_token");
  let claims = {};
  if (token) {
    try {
      const base64Url = token.split(".")[1];
      let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += "=";
      }
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      claims = JSON.parse(jsonPayload);
    } catch (e) {
      console.error("JWT Decode failed in DoctorSchedule:", e);
      claims = JSON.parse(localStorage.getItem("clinic_claims") || localStorage.getItem("user_claims") || "{}");
    }
  }

  const doctor = { id: claims.employee_id || claims.sub || claims.user_id };
  const branchId = claims.branch_id || localStorage.getItem("branch_id");
  const [showScheduleModal, setShowScheduleModal] = React.useState(false);

  if (!doctor.id) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error" variant="h6">Error: No se encontró el ID del doctor en la sesión actual.</Typography>
        <Typography variant="body2" sx={{ mt: 2, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
          DEBUG CLAIMS: {JSON.stringify(claims, null, 2)}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: "auto" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="h5" fontWeight="bold">Mi Horario</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => setShowScheduleModal(true)}
        >
          Ajustes de Plantilla Base
        </Button>
      </Box>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Aquí puedes ver tus citas y configurar tus ausencias (bloqueos) o turnos extra.
      </Typography>
      
      <Box sx={{ bgcolor: "white", p: 2, borderRadius: 2, boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
        <DoctorCalendarView doctor={doctor} branchId={branchId} token={token} />
      </Box>

      {showScheduleModal && (
        <DoctorScheduleModal
          open={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          doctorId={doctor.id}
          token={token}
        />
      )}
    </Box>
  );
}
