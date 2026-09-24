import re

with open('platform/main.py', 'r', encoding='utf-8') as f:
    main_code = f.read()

routers = [
    "auth_router", "tenants_router", "users_router", "clients_router",
    "expenses_router", "overrides_router", "agencies_router",
    "promotions_router", "reports_router", "laundry_router", "clinic_router"
]

additions = []
for router in routers:
    additions.append(f"app.include_router({router})")

# Add the root includes right after the API_V2 includes
# We find the last app.include_router line
last_include_idx = main_code.rfind("app.include_router(clinic_router, prefix=API_V2)")
if last_include_idx != -1 and "app.include_router(auth_router)" not in main_code:
    insertion_point = last_include_idx + len("app.include_router(clinic_router, prefix=API_V2)")
    new_code = main_code[:insertion_point] + "\n" + "\n".join(additions) + main_code[insertion_point:]
    
    with open('platform/main.py', 'w', encoding='utf-8') as f:
        f.write(new_code)
