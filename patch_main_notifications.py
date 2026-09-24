import re

with open('platform/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

import_pattern = r'from core.routes.client_portal import router as client_portal_router'
import_replacement = 'from core.routes.client_portal import router as client_portal_router\nfrom core.routes.notifications import router as notifications_router'
content = content.replace(import_pattern, import_replacement)

# Adding to API_V2
content = content.replace('app.include_router(client_portal_router, prefix=API_V2)', 'app.include_router(client_portal_router, prefix=API_V2)\napp.include_router(notifications_router, prefix=API_V2)')
# Adding to API_V1
content = content.replace('app.include_router(client_portal_router, prefix=API_V1)', 'app.include_router(client_portal_router, prefix=API_V1)\napp.include_router(notifications_router, prefix=API_V1)')
# Adding to no-prefix
content = content.replace('app.include_router(client_portal_router)\n', 'app.include_router(client_portal_router)\napp.include_router(notifications_router)\n')

with open('platform/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
