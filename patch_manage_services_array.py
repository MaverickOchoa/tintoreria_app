import re

with open('frontend/src/components/ManageServices.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const list = Array.isArray(data.services) ? data.services : [];", "const list = Array.isArray(data) ? data : (data.services || []);")

with open('frontend/src/components/ManageServices.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
