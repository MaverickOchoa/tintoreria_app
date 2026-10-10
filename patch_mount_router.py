import re

with open('platform/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
import_statement = "from verticals.clinic.routes import router as clinic_router\nfrom verticals.homeschool.routes import router as homeschool_router"
content = content.replace("from verticals.clinic.routes import router as clinic_router", import_statement)

# Add route (no-prefix)
content = content.replace("app.include_router(clinic_router)\n", "app.include_router(clinic_router)\napp.include_router(homeschool_router)\n")

with open('platform/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
