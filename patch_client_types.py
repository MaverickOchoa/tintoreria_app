import re

with open('frontend/src/components/ManageClientConfig.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'\.then\(d => setTypes\(d\.client_types \|\| \[\]\)\)'
replacement = r'.then(d => setTypes(Array.isArray(d) ? d : (d.client_types || [])))'

content = re.sub(pattern, replacement, content)

with open('frontend/src/components/ManageClientConfig.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
