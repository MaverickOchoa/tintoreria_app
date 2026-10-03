import re

with open('frontend/src/components/HomeschoolDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Outer Box Background
# The return statement currently starts with:
# return (
#   <Box> or similar. Let's find the start of return
target_return = r'return \(\s*<Box[^>]*>'
replacement_return = 'return (\n    <Box sx={{ bgcolor: "#fffdf5", minHeight: "100vh", pb: 10 }}>'
content = re.sub(target_return, replacement_return, content)

# 2. AppBar
target_appbar = r'<AppBar position="static" color="transparent" elevation=\{0\} sx=\{\{ borderBottom: \'1px solid #eee\' \}\}>'
replacement_appbar = '<AppBar position="static" elevation={0} sx={{ bgcolor: "#ff7043", color: "white" }}>'
# Let's just catch the AppBar more broadly
target_appbar_broad = r'<AppBar position="static" [^>]*>'
content = re.sub(target_appbar_broad, replacement_appbar, content)

# 3. Zentro Homeschool Title in AppBar
target_title = r'<Typography variant="h6" fontWeight="bold" sx=\{\{ flexGrow: 1 \}\}>\s*<SchoolIcon[^>]*/>\s*Zentro Homeschool\s*</Typography>'
replacement_title = """<Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <SchoolIcon />
            Homeschool Core
          </Typography>"""
content = re.sub(target_title, replacement_title, content)

# 4. Cerrar Sesión Button (Make it white)
target_logout = r'<Button color="error" onClick=\{handleLogout\} startIcon=\{<LogoutIcon />\}>\s*Cerrar Sesión\s*</Button>'
replacement_logout = '<Button sx={{ color: "white", fontWeight: "bold" }} onClick={handleLogout} startIcon={<LogoutIcon />}>Salir</Button>'
content = re.sub(target_logout, replacement_logout, content)

# 5. Header Section (Homeschool Core title)
target_header = r'<Box display="flex" justifyContent="space-between" alignItems="center" mb=\{4\}>\s*<Box>\s*<Typography variant="h3" fontWeight="bold" color="primary\.main">\s*Homeschool Core\s*</Typography>\s*<Typography variant="body1" color="text\.secondary">\s*Panel de control para familias\s*</Typography>\s*</Box>\s*<Button\s*variant="contained"\s*startIcon=\{<AddIcon />\}\s*onClick=\{\(\) => setOpen\(true\)\}\s*size="large"\s*>\s*Nuevo Alumno\s*</Button>\s*</Box>'

replacement_header = """<Box display="flex" justifyContent="space-between" alignItems="center" mb={4} mt={4}>
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
      </Box>"""
content = re.sub(target_header, replacement_header, content)

# 6. Mis Alumnos Typography
content = content.replace(
    '<Typography variant="h5" fontWeight="bold" mb={3}>Mis Alumnos</Typography>',
    '<Typography variant="h4" fontWeight="bold" mb={3} color="#ff7043">🚀 Mis Alumnos</Typography>'
)

# 7. Avatar Color
content = re.sub(
    r"<Avatar sx=\{\{ bgcolor: 'primary\.main', mr: 2, width: 56, height: 56 \}\}>",
    "<Avatar sx={{ bgcolor: '#ab47bc', mr: 2, width: 64, height: 64, fontSize: '2rem', fontWeight: 'bold' }}>",
    content
)

# 8. Entrar al Aula Button
target_entrar = r'<Button \s*variant="contained" \s*color="secondary"\s*fullWidth \s*size="large"\s*onClick=\{\(\) => navigate\(`/homeschool/student/\$\{student\.id\}`\)\}\s*sx=\{\{ borderRadius: 3, fontWeight: "bold", textTransform: "none", fontSize: "1\.1rem" \}\}\s*>'
replacement_entrar = """<Button 
                      variant="contained" 
                      fullWidth 
                      size="large"
                      onClick={() => navigate(`/homeschool/student/${student.id}`)}
                      sx={{ borderRadius: 4, fontWeight: "bold", textTransform: "none", fontSize: "1.2rem", bgcolor: "#ff4081", color: "white", '&:hover': { bgcolor: "#f50057" }, boxShadow: '0 4px 10px rgba(255, 64, 129, 0.3)' }}
                    >"""
content = re.sub(target_entrar, replacement_entrar, content)


with open('frontend/src/components/HomeschoolDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
