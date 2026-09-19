// src/pages/Unauthorized.jsx
import React from "react";
import { Container, Box, Typography, Button, Paper } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import { useNavigate } from "react-router-dom";

const Unauthorized = () => {
  const navigate = useNavigate();
  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: "center" }}>
        <LockIcon sx={{ fontSize: 48, color: "error.main" }} />
        <Typography variant="h5" sx={{ mt: 2, mb: 1 }}>
          Acceso denegado
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Tu cuenta no tiene permisos para ver esta página.
        </Typography>
        <Button variant="contained" onClick={() => navigate(-1)}>
          Volver
        </Button>
      </Paper>
    </Container>
  );
};

export default Unauthorized;
