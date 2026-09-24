import re

with open('frontend/src/components/EmployeeForm.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'setRoles\(\(roleData\.roles \|\| \[\]\)\.filter\(r => !excluded\.includes\(r\.name\)\)\);'
replacement = 'const fetchedRoles = Array.isArray(roleData) ? roleData : (roleData.roles || []);\n          setRoles(fetchedRoles.filter(r => !excluded.includes(r.name)));'

content = re.sub(pattern, replacement, content)

with open('frontend/src/components/EmployeeForm.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
