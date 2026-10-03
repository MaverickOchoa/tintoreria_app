import re

with open('frontend/src/components/HomeschoolDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Background
content = content.replace('minHeight: "100vh"', 'minHeight: "100vh", bgcolor: "#fffdf5", pb: 10')

# 2. AppBar
content = re.sub(
    r'<AppBar position="static".*?>\s*<Toolbar>\s*<Typography variant="h6".*?>.*?</Typography>\s*<Button color="error".*?>\s*Cerrar Sesión\s*</Button>\s*</Toolbar>\s*</AppBar>',
    '''<AppBar position="static" elevation={0} sx={{ bgcolor: "#ff7043", color: "white" }}>
        <Toolbar>
          <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <SchoolIcon />
            Homeschool Core
          </Typography>
          <Button sx={{ color: "white", fontWeight: "bold" }} onClick={handleLogout} startIcon={<LogoutIcon />}>
            Salir
          </Button>
        </Toolbar>
      </AppBar>''',
    content,
    flags=re.DOTALL
)

# 3. Header Text
content = re.sub(
    r'<Box display="flex" justifyContent="space-between" alignItems="center" mb=\{4\}>\s*<Box>\s*<Typography variant="h4" fontWeight="bold" color="primary">\s*Homeschool Core\s*</Typography>\s*<Typography variant="subtitle1" color="text\.secondary">\s*Panel de control para familias\s*</Typography>\s*</Box>\s*<Button variant="contained" startIcon=\{<AddIcon />\} onClick=\{\(\) => setOpen\(true\)\}>\s*Nuevo Alumno\s*</Button>\s*</Box>',
    '''<Box display="flex" justifyContent="space-between" alignItems="center" mb={4} mt={4}>
        <Box>
          <Typography variant="h3" fontWeight="900" sx={{ color: "#00acc1", fontFamily: "'Comic Sans MS', 'Chalkboard SE', sans-serif" }}>
            🏠 Mi Familia
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Panel de control para papás
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={() => setOpen(true)}
          size="large"
          sx={{ borderRadius: 6, bgcolor: "#29b6f6", fontWeight: "bold", '&:hover': { bgcolor: '#039be5' } }}
        >
          Nuevo Alumno
        </Button>
      </Box>''',
    content,
    flags=re.DOTALL
)

# 4. Avatar and Button inside map
content = re.sub(
    r"<Avatar sx=\{\{ bgcolor: 'primary\.main', mr: 2, width: 56, height: 56 \}\}>",
    "<Avatar sx={{ bgcolor: '#ab47bc', mr: 2, width: 64, height: 64, fontSize: '2rem', fontWeight: 'bold' }}>",
    content
)

content = re.sub(
    r'<Button \s*variant="contained" \s*color="secondary"\s*fullWidth \s*size="large"\s*onClick=\{\(\) => navigate\(`/homeschool/student/\$\{student\.id\}`\)\}\s*sx=\{\{ borderRadius: 3, fontWeight: "bold", textTransform: "none", fontSize: "1\.1rem" \}\}\s*>',
    '''<Button 
                      variant="contained" 
                      fullWidth 
                      size="large"
                      onClick={() => navigate(`/homeschool/student/${student.id}`)}
                      sx={{ borderRadius: 4, fontWeight: "bold", textTransform: "none", fontSize: "1.2rem", bgcolor: "#ff4081", color: "white", '&:hover': { bgcolor: "#f50057" }, boxShadow: '0 4px 10px rgba(255, 64, 129, 0.3)' }}
                    >''',
    content
)

# 5. Mis Alumnos title
content = content.replace(
    '<Typography variant="h5" fontWeight="bold" mb={3}>Mis Alumnos</Typography>',
    '<Typography variant="h4" fontWeight="bold" mb={3} color="#ff7043">🚀 Mis Alumnos</Typography>'
)

with open('frontend/src/components/HomeschoolDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
