import re

with open('frontend/src/components/HomeschoolDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'(<Button[^>]+onClick=\{[^}]*handleEdit\(student\)\}[^>]*>Editar</Button>)', 
                 r'\1\n                      <Button variant="text" color="error" size="small" sx={{ minWidth: "40px", ml: 1 }} onClick={() => handleDelete(student.id)}>\n                        🗑️\n                      </Button>', 
                 content)

with open('frontend/src/components/HomeschoolDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
