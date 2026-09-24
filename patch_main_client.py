import re

with open('platform/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
import_pattern = r'from core.routes.cash_cuts import router as cash_cuts_router'
import_replacement = 'from core.routes.cash_cuts import router as cash_cuts_router\nfrom core.routes.client_portal import router as client_portal_router'
content = content.replace(import_pattern, import_replacement)

# Add route
route_pattern = r'app.include_router\(cash_cuts_router, prefix="/api/v1"\)'
route_replacement = 'app.include_router(cash_cuts_router, prefix="/api/v1")\napp.include_router(client_portal_router, prefix="/api/v1")'
content = content.replace(route_pattern, route_replacement)

with open('platform/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
