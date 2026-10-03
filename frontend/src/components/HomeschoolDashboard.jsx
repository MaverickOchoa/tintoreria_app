import React, { useState, useEffect } from "react";
import {
  Container, Typography, Box, Grid, Card, CardContent, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, IconButton, Chip, Stack, Alert, CircularProgress,
  Avatar, LinearProgress, AppBar, Toolbar, Menu, MenuItem as MuiMenuItem, Fade
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SchoolIcon from "@mui/icons-material/School";
import LogoutIcon from "@mui/icons-material/Logout";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Helper for title case
const toTitleCase = (str) => {
  return str.replace(
    /\w\S*/g,
    function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
};

const HomeschoolDashboard = () => {
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Dialog State
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    grade_id: "",
    date_of_birth: "",
    bilingual_preference: "es"
  });
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_claims");
    localStorage.removeItem("role");
    localStorage.removeItem("vertical_type");
    navigate("/login");
  };


  useEffect(() => {
    fetchData();
  }, []);

  
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      
      // Auto-seed curriculum if empty
      await fetch(`${API}/homeschool/seed-curriculum`, {
        method: "POST"
      }).catch(() => {});

      // Fetch Curriculum (Grades)
      const curRes = await fetch(`${API}/homeschool/curriculum`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const curData = await curRes.json();
      setGrades(curData.grades || []);

      // Fetch Students
      const stuRes = await fetch(`${API}/homeschool/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (stuRes.ok) {
        const stuData = await stuRes.json();
        setStudents(stuData);
      }
    } catch (err) {
      console.error(err);
      setError("Error al cargar los datos del Homeschool");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === "first_name" || name === "last_name") {
      finalValue = toTitleCase(value);
    }
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({
      first_name: "",
      last_name: "",
      grade_id: "",
      date_of_birth: "",
      bilingual_preference: "es"
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const token = localStorage.getItem("access_token");
      
      // Transform date to ISO if present
      let formattedDate = null;
      if (formData.date_of_birth) {
         formattedDate = new Date(formData.date_of_birth).toISOString();
      }

      const payload = {
        ...formData,
        date_of_birth: formattedDate
      };

      const res = await fetch(`${API}/homeschool/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchData();
        handleClose();
      } else {
        const errData = await res.json();
        setError(errData.detail || "Error al guardar el alumno");
      }
    } catch (err) {
      console.error(err);
      setError("Error de conexi\u00f3n");
    } finally {
      setSubmitting(false);
    }
  };

  const getGradeName = (gradeId) => {
    const grade = grades.find(g => g.id === gradeId);
    if (!grade) return "Desconocido";
    return grade.name?.es || grade.name?.en || "Grado " + grade.level_order;
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }


  return (
    <Box sx={{ bgcolor: "#f5f6fa", minHeight: "100vh" }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: "#ffffff", borderBottom: "1px solid #e0e0e0" }}>
        <Toolbar>
          <SchoolIcon sx={{ color: "primary.main", mr: 2 }} />
          <Typography variant="h6" fontWeight="bold" color="text.primary" sx={{ flexGrow: 1 }}>
            Zentro Homeschool
          </Typography>
          <Button 
            color="error" 
            variant="text" 
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
          >
            Cerrar Sesión
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight="bold" color="primary">
            Homeschool Core
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Panel de control para familias
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
          sx={{ borderRadius: 2 }}
        >
          Nuevo Alumno
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Typography variant="h6" fontWeight="bold" mb={2}>
        Mis Alumnos
      </Typography>

      {students.length === 0 ? (
        <Card variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3, bgcolor: '#fafafa' }}>
          <SchoolIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
          <Typography variant="h6" color="text.secondary">Aún no tienes alumnos registrados</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Comienza dando de alta a tus hijos para asignarles su currículum.
          </Typography>
          <Button variant="outlined" onClick={() => setOpen(true)}>
            Agregar mi primer alumno
          </Button>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {students.map((student) => (
            <Grid item xs={12} sm={6} md={4} key={student.id}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 56, height: 56 }}>
                      {student.first_name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {student.first_name} {student.last_name}
                      </Typography>
                      <Chip 
                        label={getGradeName(student.grade_id)} 
                        size="small" 
                        color="secondary" 
                        sx={{ mt: 0.5, fontWeight: 'bold' }} 
                      />
                    </Box>
                  </Box>
                  
                  <Box mt={3}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" color="text.secondary">Progreso Semanal</Typography>
                      <Typography variant="body2" fontWeight="bold">0%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={0} sx={{ height: 8, borderRadius: 4 }} />
                  </Box>
                  
                  <Box mt={3} display="flex" gap={1}>
                    <Button variant="contained" fullWidth size="small">
                      Ver Progreso
                    </Button>
                    <Button variant="outlined" fullWidth size="small">
                      Editar
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Nuevo Alumno Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>Registrar Nuevo Alumno</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={3}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Nombre"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Apellidos"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    fullWidth
                    required
                  />
                </Grid>
              </Grid>
              
              <TextField
                select
                label="Grado Escolar"
                name="grade_id"
                value={formData.grade_id}
                onChange={handleChange}
                fullWidth
                required
              >
                {grades.map((g) => (
                  <MenuItem key={g.id} value={g.id}>
                    {g.name?.es || g.name?.en || `Grado ${g.level_order}`}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Fecha de Nacimiento"
                name="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={handleChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                select
                label="Preferencia de Idioma"
                name="bilingual_preference"
                value={formData.bilingual_preference}
                onChange={handleChange}
                fullWidth
                helperText="El sistema priorizará este idioma para las lecciones"
              >
                <MenuItem value="es">Español (Principal)</MenuItem>
                <MenuItem value="en">Inglés (Principal)</MenuItem>
                <MenuItem value="bilingual">Bilingüe (Mezclado)</MenuItem>
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} disabled={submitting}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? "Guardando..." : "Guardar Alumno"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
    </Box>
  );
};

export default HomeschoolDashboard;
