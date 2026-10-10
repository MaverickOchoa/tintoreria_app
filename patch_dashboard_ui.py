import re

with open('frontend/src/components/HomeschoolDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix unicode
content = content.replace(r'Ingl\u00e9s', 'Inglés')
content = content.replace(r'Biling\u00fce', 'Bilingüe')

# Add imports
content = content.replace(
    'Avatar, LinearProgress',
    'Avatar, LinearProgress, AppBar, Toolbar, Menu, MenuItem as MuiMenuItem, Fade'
)
content = content.replace(
    'import SchoolIcon from "@mui/icons-material/School";',
    'import SchoolIcon from "@mui/icons-material/School";\nimport LogoutIcon from "@mui/icons-material/Logout";\nimport { useNavigate } from "react-router-dom";'
)

# Add logout logic to component
logout_logic = '''
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_claims");
    localStorage.removeItem("role");
    localStorage.removeItem("vertical_type");
    navigate("/login");
  };
'''

content = content.replace('const [submitting, setSubmitting] = useState(false);', 'const [submitting, setSubmitting] = useState(false);\n' + logout_logic)

# Call seed endpoint
fetch_data_replacement = '''
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
'''

content = re.sub(r'const fetchData = async \(\) => \{\s*try \{\s*setLoading\(true\);\s*const token = localStorage\.getItem\("access_token"\);\s*// Fetch Curriculum \(Grades\)\s*const curRes = await fetch\(`\$\{API\}/homeschool/curriculum`.*?\}\);', fetch_data_replacement, content, flags=re.DOTALL)


# Add AppBar
render_replacement = '''
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
'''

content = content.replace('  return (\n    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>', render_replacement)
content = content.replace('    </Container>\n  );\n};', '    </Container>\n    </Box>\n  );\n};')

with open('frontend/src/components/HomeschoolDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
