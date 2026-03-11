import React from "react";
import { Box, Typography } from "@mui/material";
import OrderStatsCards from "./OrderStatsCards";

export default function OperationalPanel() {
  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: { xs: 2, md: 3 } }}>
      <Typography variant="h4" fontWeight={700} color="primary" mb={0.5}>
        Panel Operativo
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Resumen del estado de las órdenes del día.
      </Typography>
      <OrderStatsCards />
    </Box>
  );
}
