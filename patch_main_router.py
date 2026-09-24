import re

with open('platform/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('app.include_router(cash_cuts_router, prefix=API_V2)', 'app.include_router(cash_cuts_router, prefix=API_V2)\napp.include_router(client_portal_router, prefix=API_V2)')
content = content.replace('app.include_router(cash_cuts_router, prefix=API_V1)', 'app.include_router(cash_cuts_router, prefix=API_V1)\napp.include_router(client_portal_router, prefix=API_V1)')
content = content.replace('app.include_router(cash_cuts_router)\n', 'app.include_router(cash_cuts_router)\napp.include_router(client_portal_router)\n')

with open('platform/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
