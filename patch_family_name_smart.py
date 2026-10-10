import re

with open('frontend/src/components/HomeschoolDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = 'const familyName = claims.business_name || "Mi Familia";'
replacement = """let familyName = claims.business_name || "Mi Familia";
  if (familyName !== "Mi Familia" && !familyName.toLowerCase().includes("familia")) {
    familyName = `Familia ${familyName}`;
  }"""

content = content.replace(target, replacement)

with open('frontend/src/components/HomeschoolDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
