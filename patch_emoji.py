import re

with open('frontend/src/components/HomeschoolDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# find the mangled string: 
content = re.sub(r'<Typography variant="h3" .*?>\s*.*\{familyName\}\s*</Typography>', 
                 '<Typography variant="h3" fontWeight="900" sx={{ color: "#00acc1", fontFamily: "\'Comic Sans MS\', \'Chalkboard SE\', sans-serif" }}>\n            🏠 {familyName}\n          </Typography>', 
                 content, flags=re.DOTALL)

with open('frontend/src/components/HomeschoolDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
