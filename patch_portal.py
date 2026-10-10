import re

with open('frontend/src/components/HomeschoolStudentPortal.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_statement = "import CountingGame from './minigames/CountingGame';\n"
content = content.replace('import ArrowBackIcon from "@mui/icons-material/ArrowBack";', 'import ArrowBackIcon from "@mui/icons-material/ArrowBack";\n' + import_statement)

grid_target = """        <Grid container spacing={4} justifyContent="center">
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
        </Grid>"""

grid_replacement = """        <Box sx={{ mt: 4, p: 4, bgcolor: '#ffffff', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
          <CountingGame />
        </Box>"""

content = content.replace(grid_target, grid_replacement)

# Make background more colorful
content = content.replace('bgcolor: "#f0f8ff"', 'bgcolor: "#e0f7fa"')

with open('frontend/src/components/HomeschoolStudentPortal.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
