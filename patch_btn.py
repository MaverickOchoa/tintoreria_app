import re

with open('frontend/src/components/HomeschoolDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """                      </Box>
                    </Box>
                    
                    <Box mt={2}>
                      <Typography variant="body2" color="text.secondary">
                        <SchoolIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 1 }} />
                        Dominio Global: 0%
                      </Typography>
                      <LinearProgress variant="determinate" value={0} sx={{ mt: 1, mb: 2, height: 8, borderRadius: 4 }} />
                      <Button variant="outlined" size="small" fullWidth sx={{ borderRadius: 2 }}>
                        Editar
                      </Button>
                    </Box>
                  </CardContent>"""

replacement = """                      </Box>
                    </Box>
                    
                    <Box mt={2}>
                      <Typography variant="body2" color="text.secondary">
                        <SchoolIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 1 }} />
                        Dominio Global: 0%
                      </Typography>
                      <LinearProgress variant="determinate" value={0} sx={{ mt: 1, mb: 2, height: 8, borderRadius: 4 }} />
                      <Button variant="outlined" size="small" fullWidth sx={{ borderRadius: 2, mb: 1 }}>
                        Editar Perfil
                      </Button>
                      <Button 
                        variant="contained" 
                        size="large"
                        fullWidth 
                        color="secondary"
                        onClick={() => navigate(`/homeschool/student/${student.id}`)}
                        sx={{ borderRadius: 3, fontWeight: "bold", textTransform: "none", fontSize: "1.1rem" }}
                      >
                        Entrar al Aula 🚀
                      </Button>
                    </Box>
                  </CardContent>"""

content = content.replace(target, replacement)

with open('frontend/src/components/HomeschoolDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
