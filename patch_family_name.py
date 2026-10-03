import re

with open('frontend/src/components/HomeschoolDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Parse family name
content = content.replace(
    'const HomeschoolDashboard = () => {',
    'const HomeschoolDashboard = () => {\n  const claimsStr = localStorage.getItem("user_claims");\n  const claims = claimsStr ? JSON.parse(claimsStr) : {};\n  const familyName = claims.business_name || "Mi Familia";'
)

# 2. Replace static string
content = content.replace(
    '🏠 Mi Familia',
    '🏠 {familyName}'
)

with open('frontend/src/components/HomeschoolDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
