import React from "react";
import { Box, Typography, Divider } from "@mui/material";
import { BRAND, getVerticalBrand } from "../../brand";

export default function ZentroFooter({ verticalType = "laundry" }) {
  const vertical = getVerticalBrand(verticalType);
  return (
    <Box sx={{ mt: "auto", pt: 3 }}>
      <Divider />
      <Box sx={{ py: 2, px: 3, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {vertical.name}
        </Typography>
        <Typography variant="caption" color="text.disabled">
          {BRAND.footer} · © {BRAND.year}
        </Typography>
      </Box>
    </Box>
  );
}
