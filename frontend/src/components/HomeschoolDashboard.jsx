import React, { useState, useEffect } from "react";
import {
  Container, Typography, Box, Grid, Card, CardContent, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, IconButton, Chip, Stack, Alert, CircularProgress,
  Avatar, LinearProgress, AppBar, Toolbar, Menu, MenuItem as MuiMenuItem, Fade, CardActions
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
  const claimsStr = localStorage.getItem("user_claims");
  const claims = claimsStr ? JSON.parse(claimsStr) : {};
  let familyName = claims.business_name || claims.username || "Mi Familia";
  if (familyName !== "Mi Familia" && !familyName.toLowerCase().includes("familia")) {
    // Capitalize first letter
    familyName = familyName.charAt(0).toUpperCase() + familyName.slice(1);
    familyName = `Familia ${familyName}`;
  }
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
    bilingual_preference: "es",
    gender: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_claims");
    localStorage.removeItem("role");
    localStorage.removeItem("vertical_type");
    navigate("/login");
  };


  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        setDeferredPrompt(null);
      });
    }
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

  const handleDelete = async (studentId) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este alumno?")) return;
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API}/homeschool/students/${studentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (student) => {
    setEditingStudentId(student.id);
    setFormData({
      first_name: student.first_name || "",
      last_name: student.last_name || "",
      grade_id: student.grade_id || "",
      date_of_birth: student.date_of_birth ? student.date_of_birth.substring(0,10) : "",
      bilingual_preference: student.bilingual_preference || "es",
      gender: student.gender || ""
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({
      first_name: "",
      last_name: "",
      grade_id: "",
      date_of_birth: "",
      bilingual_preference: "es",
    gender: ""
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

      const url = editingStudentId 
        ? `${API}/homeschool/students/${editingStudentId}` 
        : `${API}/homeschool/students`;
      const method = editingStudentId ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
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
    <Box sx={{ bgcolor: "#fffdf5", minHeight: "100vh", pb: 10 }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: "#ff7043", color: "white" }}>
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

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4} mt={4}>
        <Box>
          <Typography variant="h3" fontWeight="900" sx={{ color: "#00acc1", fontFamily: "'Comic Sans MS', 'Chalkboard SE', sans-serif" }}>
            🏠 {familyName}
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Panel de control para papás
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          {deferredPrompt && (
            <Button 
              variant="outlined" 
              onClick={handleInstallClick}
              size="large"
              sx={{ borderRadius: 6, fontWeight: "bold", color: "#ff7043", borderColor: "#ff7043", '&:hover': { bgcolor: '#fff3e0' } }}
            >
              Instalar App 📱
            </Button>
          )}
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => setOpen(true)}
            size="large"
            sx={{ borderRadius: 6, bgcolor: "#29b6f6", fontWeight: "bold", '&:hover': { bgcolor: '#039be5' } }}
          >
            Nuevo Alumno
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Typography variant="h4" fontWeight="bold" mb={3} color="#ff7043">
        🚀 Mis Alumnos
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
              <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', position: 'relative' }}>
                  <IconButton 
                    color="error" 
                    size="small" 
                    sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }} 
                    onClick={() => handleDelete(student.id)} 
                    title="Borrar alumno"
                  >
                    <span role="img" aria-label="borrar" style={{ fontSize: '1.2rem' }}>🗑️</span>
                  </IconButton>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar sx={{ 
                      bgcolor: student.gender === 'girl' ? '#ec407a' : (student.gender === 'boy' ? '#29b6f6' : '#ab47bc'), 
                      mr: 2, width: 64, height: 64, fontSize: '2rem', fontWeight: 'bold' 
                    }}>
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
                  
                  <Box mt={3} display="flex" flexDirection="column" gap={1}>
                    <Button 
                      variant="contained" 
                      fullWidth 
                      size="large"
                      onClick={() => navigate(`/homeschool/student/${student.id}`)}
                      sx={{ borderRadius: 4, fontWeight: "bold", textTransform: "none", fontSize: "1.2rem", bgcolor: "#ff4081", color: "white", '&:hover': { bgcolor: "#f50057" }, boxShadow: '0 4px 10px rgba(255, 64, 129, 0.3)' }}
                    >
                      Entrar al Aula 🚀
                    </Button>
                    <Box display="flex" gap={1.5}>
                        <Button 
                          variant="contained" 
                          sx={{ flex: 1, borderRadius: 4, bgcolor: '#29b6f6', color: 'white', fontWeight: 'bold', textTransform: 'none', fontSize: '0.95rem', boxShadow: '0 3px 6px rgba(41, 182, 246, 0.3)', '&:hover': { bgcolor: '#0288d1' } }} 
                          size="small"
                        >
                          📊 Progreso
                        </Button>
                        <Button 
                          variant="contained" 
                          sx={{ flex: 1, borderRadius: 4, bgcolor: '#ffa726', color: 'white', fontWeight: 'bold', textTransform: 'none', fontSize: '0.95rem', boxShadow: '0 3px 6px rgba(255, 167, 38, 0.3)', '&:hover': { bgcolor: '#f57c00' } }} 
                          size="small" 
                          onClick={() => handleEdit(student)}
                        >
                          ✏️ Editar
                        </Button>
                      </Box>
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
          <DialogTitle>{editingStudentId ? "Editar Alumno" : "Registrar Nuevo Alumno"}</DialogTitle>
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
                label="¿Es niño o niña?"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                fullWidth
                required
              >
                <MenuItem value="boy">Niño 👦</MenuItem>
                <MenuItem value="girl">Niña 👧</MenuItem>
              </TextField>

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
              {submitting ? "Guardando..." : (editingStudentId ? "Actualizar Alumno" : "Guardar Alumno")}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
    </Box>
  );
};

export default HomeschoolDashboard;
