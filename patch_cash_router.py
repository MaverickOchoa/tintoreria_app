import re

with open('platform/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
import_pattern = r'''from core\.routes\.reports import router as reports_router'''
import_replacement = '''from core.routes.reports import router as reports_router
from core.routes.cash_cuts import router as cash_cuts_router'''
content = re.sub(import_pattern, import_replacement, content)

# Add to API_V2
v2_pattern = r'''app\.include_router\(reports_router, prefix=API_V2\)'''
v2_replacement = '''app.include_router(reports_router, prefix=API_V2)
app.include_router(cash_cuts_router, prefix=API_V2)'''
content = re.sub(v2_pattern, v2_replacement, content)

# Add to API_V1
v1_pattern = r'''app\.include_router\(reports_router, prefix=API_V1\)'''
v1_replacement = '''app.include_router(reports_router, prefix=API_V1)
app.include_router(cash_cuts_router, prefix=API_V1)'''
content = re.sub(v1_pattern, v1_replacement, content)

# Add to no-prefix
no_prefix_pattern = r'''app\.include_router\(reports_router\)'''
no_prefix_replacement = '''app.include_router(reports_router)
app.include_router(cash_cuts_router)'''
content = re.sub(no_prefix_pattern, no_prefix_replacement, content)

with open('platform/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
