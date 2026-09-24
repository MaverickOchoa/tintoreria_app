import re

with open('frontend/src/components/EmployeeForm.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''      try \{
        const res = await fetch\(`\$\{API_BASE_URL\}/employees`, \{
          method: "POST",
          headers: \{ "Content-Type": "application/json", Authorization: `Bearer \$\{token\}` \},
          body: JSON\.stringify\(payload\),
        \}\);
        const data = await res\.json\(\);
        if \(!res\.ok\) throw new Error\(data\.detail \|\| data\.message \|\| "Error al crear usuario"\);'''

replacement = '''      try {
        const res = await fetch(`${API_BASE_URL}/employees`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || data.message || "Error al crear usuario (Status: " + res.status + ")");'''

content = re.sub(pattern, replacement, content)

with open('frontend/src/components/EmployeeForm.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
