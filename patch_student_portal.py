import re

with open('frontend/src/components/HomeschoolStudentPortal.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'const [student, setStudent] = useState(null);',
    ''
)
content = content.replace(
    'const API = import.meta.env.VITE_API_URL || "http://localhost:8000";',
    ''
)

with open('frontend/src/components/HomeschoolStudentPortal.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
