import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Container, Typography, Box, AppBar, Toolbar, IconButton, 
  Card, CardContent, Button, Grid
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExtensionIcon from "@mui/icons-material/Extension";



const HomeschoolStudentPortal = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  

  useEffect(() => {
    // We will fetch the actual student details here later
    // For now, it's just a UI placeholder
  }, [studentId]);

  return (
    <Box sx={{ bgcolor: "#f0f8ff", minHeight: "100vh" }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: "#00acc1" }}>
        <Toolbar>
          <IconButton 
            edge="start" 
            color="inherit" 
            onClick={() => navigate("/homeschool")} 
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1 }}>
            Aula Virtual
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="md" sx={{ mt: 8, textAlign: "center" }}>
        <Typography variant="h3" fontWeight="bold" color="#00838f" gutterBottom>
          ¡Bienvenido al Aula!
        </Typography>
        <Typography variant="h6" color="text.secondary" mb={6}>
          Estamos preparando tus misiones de hoy...
        </Typography>

        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ borderRadius: 4, border: "2px dashed #00acc1", bgcolor: "transparent", boxShadow: "none" }}>
              <CardContent sx={{ py: 6 }}>
                <ExtensionIcon sx={{ fontSize: 60, color: "#00acc1", opacity: 0.5, mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Minijuego en construcción
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default HomeschoolStudentPortal;
