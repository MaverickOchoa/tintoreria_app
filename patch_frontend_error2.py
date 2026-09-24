import re

with open('frontend/src/components/ManageBusinesses.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'if \(!res\.ok\) throw new Error\("Error al eliminar"\);'
replacement = '''if (!res.ok) {
        const data = await res.json().catch(()=>({}));
        throw new Error(data.detail || data.message || "Error al eliminar");
      }'''

content = re.sub(pattern, replacement, content)

with open('frontend/src/components/ManageBusinesses.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
