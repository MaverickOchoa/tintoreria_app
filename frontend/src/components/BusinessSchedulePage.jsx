import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import BusinessSchedule from "./BusinessSchedule";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

export default function BusinessSchedulePage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");
  const claims = JSON.parse(localStorage.getItem("user_claims") || "{}");

  return (
    <Box p={3} maxWidth={900} mx="auto">
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        Volver
      </Button>
      <Typography variant="h5" fontWeight={700} mb={3}>Horarios y Días Festivos</Typography>
      <BusinessSchedule businessId={claims.business_id} token={token} />
    </Box>
  );
}
