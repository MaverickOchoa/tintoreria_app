import re

with open('platform/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

API_V1 = "/api/v1"

pattern = r'''app\.include_router\(auth_router\)
app\.include_router\(tenants_router\)
app\.include_router\(users_router\)
app\.include_router\(clients_router\)
app\.include_router\(expenses_router\)
app\.include_router\(overrides_router\)
app\.include_router\(agencies_router\)
app\.include_router\(promotions_router\)
app\.include_router\(reports_router\)
app\.include_router\(laundry_router\)
app\.include_router\(clinic_router\)'''

replacement = f'''API_V1 = "{API_V1}"
app.include_router(auth_router, prefix=API_V1)
app.include_router(tenants_router, prefix=API_V1)
app.include_router(users_router, prefix=API_V1)
app.include_router(clients_router, prefix=API_V1)
app.include_router(expenses_router, prefix=API_V1)
app.include_router(overrides_router, prefix=API_V1)
app.include_router(agencies_router, prefix=API_V1)
app.include_router(promotions_router, prefix=API_V1)
app.include_router(reports_router, prefix=API_V1)
app.include_router(laundry_router, prefix=API_V1)
app.include_router(clinic_router, prefix=API_V1)

# Keep the no-prefix routes just in case
app.include_router(auth_router)
app.include_router(tenants_router)
app.include_router(users_router)
app.include_router(clients_router)
app.include_router(expenses_router)
app.include_router(overrides_router)
app.include_router(agencies_router)
app.include_router(promotions_router)
app.include_router(reports_router)
app.include_router(laundry_router)
app.include_router(clinic_router)'''

content = re.sub(pattern, replacement, content)

with open('platform/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
