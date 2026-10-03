with open('frontend/src/components/HomeschoolDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Background
content = content.replace('minHeight: "100vh"', 'minHeight: "100vh", bgcolor: "#fffdf5", pb: 10')

# 2. AppBar
old_appbar = '<AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: \'1px solid #eee\' }}>'
new_appbar = '<AppBar position="static" elevation={0} sx={{ bgcolor: "#ff7043", color: "white" }}>'
content = content.replace(old_appbar, new_appbar)

# 3. Zentro Homeschool Title in AppBar
old_title = '''<Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1 }}>
          <SchoolIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Zentro Homeschool
        </Typography>'''
new_title = '''<Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SchoolIcon />
          Homeschool Core
        </Typography>'''
content = content.replace(old_title, new_title)

# 4. Cerrar Sesión Button (Make it white)
old_logout = '<Button color="error" onClick={handleLogout} startIcon={<LogoutIcon />}>'
new_logout = '<Button sx={{ color: "white", fontWeight: "bold" }} onClick={handleLogout} startIcon={<LogoutIcon />}>'
content = content.replace(old_logout, new_logout)
content = content.replace('Cerrar Sesión\n        </Button>', 'Salir\n        </Button>')

# 5. Header Section (Homeschool Core title)
old_header = '''<Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
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
      </Box>'''

new_header = '''<Box display="flex" justifyContent="space-between" alignItems="center" mb={4} mt={4}>
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
      </Box>'''
content = content.replace(old_header, new_header)

# 6. Mis Alumnos Typography
content = content.replace(
    '<Typography variant="h6" fontWeight="bold" mb={2}>\n        Mis Alumnos\n      </Typography>',
    '<Typography variant="h4" fontWeight="bold" mb={3} color="#ff7043">\n        🚀 Mis Alumnos\n      </Typography>'
)

# 7. Avatar Color
content = content.replace(
    "bgcolor: 'primary.main', mr: 2, width: 56, height: 56",
    "bgcolor: '#ab47bc', mr: 2, width: 64, height: 64, fontSize: '2rem', fontWeight: 'bold'"
)

# 8. Entrar al Aula Button
old_entrar = '''<Button 
                    variant="contained" 
                    color="secondary"
                    fullWidth 
                    size="large"
                    onClick={() => navigate(`/homeschool/student/${student.id}`)}
                    sx={{ borderRadius: 3, fontWeight: "bold", textTransform: "none", fontSize: "1.1rem" }}
                  >'''

new_entrar = '''<Button 
                    variant="contained" 
                    fullWidth 
                    size="large"
                    onClick={() => navigate(`/homeschool/student/${student.id}`)}
                    sx={{ borderRadius: 4, fontWeight: "bold", textTransform: "none", fontSize: "1.2rem", bgcolor: "#ff4081", color: "white", '&:hover': { bgcolor: "#f50057" }, boxShadow: '0 4px 10px rgba(255, 64, 129, 0.3)' }}
                  >'''
content = content.replace(old_entrar, new_entrar)

with open('frontend/src/components/HomeschoolDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
