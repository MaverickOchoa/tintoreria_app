import re

with open('frontend/src/components/HomeschoolDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'<Box sx=\{\{.*?minHeight: "100vh".*?\}\}>',
    '<Box sx={{ bgcolor: "#fffdf5", minHeight: "100vh", pb: 10 }}>',
    content
)

with open('frontend/src/components/HomeschoolDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
