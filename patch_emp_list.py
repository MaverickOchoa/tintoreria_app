import re

with open('frontend/src/components/EmployeesPage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'if \(res\.ok\) setEmployees\(data\.employees \|\| \[\]\);'
replacement = r'if (res.ok) setEmployees(Array.isArray(data) ? data : (data.employees || []));'

content = re.sub(pattern, replacement, content)

with open('frontend/src/components/EmployeesPage.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
