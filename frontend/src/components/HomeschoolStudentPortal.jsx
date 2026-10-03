import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Typography, Box, AppBar, Toolbar, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CountingGame from './minigames/CountingGame';





const HomeschoolStudentPortal = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  

  useEffect(() => {
    // We will fetch the actual student details here later
    // For now, it's just a UI placeholder
  }, [studentId]);

  return (
    <Box sx={{ bgcolor: "#e0f7fa", minHeight: "100vh" }}>
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

        <Box sx={{ mt: 4, p: 4, bgcolor: '#ffffff', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
          <CountingGame />
        </Box>
      </Container>
    </Box>
  );
};

export default HomeschoolStudentPortal;
