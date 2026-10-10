import re

with open('frontend/src/components/HomeschoolDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Deduplicate handleDelete
if content.count('const handleDelete =') > 1:
    first_idx = content.find('const handleDelete =')
    last_idx = content.rfind('const handleDelete =')
    if first_idx != last_idx:
        content = content[:first_idx] + content[last_idx:]

# 2. Fix the buttons layout
pattern = r'<Button[^>]*>\s*Ver Progreso\s*</Button>.*?(?=</Box>)'
replacement = '''<Button variant="outlined" sx={{ flex: 1, borderRadius: 2 }} size="small">Ver Progreso</Button>
                      <Button variant="outlined" sx={{ flex: 1, borderRadius: 2 }} size="small" onClick={() => handleEdit(student)}>Editar</Button>
                      <IconButton color="error" size="small" sx={{ ml: 0.5 }} onClick={() => handleDelete(student.id)} title="Borrar">
                        <span role="img" aria-label="borrar" style={{ fontSize: '1.2rem' }}>🗑️</span>
                      </IconButton>'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Ensure IconButton is imported
if "IconButton" not in content and "Button," in content:
    content = re.sub(r'import \{(.*?Button.*?)\} from [\'"]@mui/material[\'"];', r'import {\1, IconButton} from "@mui/material";', content)

with open('frontend/src/components/HomeschoolDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
