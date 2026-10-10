import re

with open('frontend/src/components/HomeschoolDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = r'<Box mt=\{3\} display="flex" gap=\{1\}>\s*<Button variant="contained" fullWidth size="small">\s*Ver Progreso\s*</Button>\s*<Button variant="outlined" fullWidth size="small">\s*Editar\s*</Button>\s*</Box>'

replacement = """<Box mt={3} display="flex" flexDirection="column" gap={1}>
                    <Button 
                      variant="contained" 
                      color="secondary"
                      fullWidth 
                      size="large"
                      onClick={() => navigate(`/homeschool/student/${student.id}`)}
                      sx={{ borderRadius: 3, fontWeight: "bold", textTransform: "none", fontSize: "1.1rem" }}
                    >
                      Entrar al Aula 🚀
                    </Button>
                    <Box display="flex" gap={1}>
                      <Button variant="outlined" fullWidth size="small">
                        Ver Progreso
                      </Button>
                      <Button variant="outlined" fullWidth size="small">
                        Editar
                      </Button>
                    </Box>
                  </Box>"""

content = re.sub(target, replacement, content, flags=re.DOTALL)

with open('frontend/src/components/HomeschoolDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
