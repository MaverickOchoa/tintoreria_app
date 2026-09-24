import re

with open('frontend/src/components/EmployeeForm.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'const data = await res\.json\(\);\s+if \(!res\.ok\) throw new Error\(data\.detail \|\| data\.message \|\| "Error al crear usuario"\);'

replacement = '''const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || data.message || "Error al crear usuario (Status: " + res.status + ")");'''

content = re.sub(pattern, replacement, content)

with open('frontend/src/components/EmployeeForm.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
