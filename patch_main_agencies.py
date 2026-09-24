import re

with open('platform/main.py', 'r', encoding='utf-8') as f:
    main_code = f.read()

# Add import
if "from core.routes.agencies import router as agencies_router" not in main_code:
    main_code = main_code.replace(
        "from core.routes.overrides import router as overrides_router",
        "from core.routes.overrides import router as overrides_router\nfrom core.routes.agencies import router as agencies_router"
    )

# Add include_router
if "app.include_router(agencies_router, prefix=API_V2)" not in main_code:
    main_code = main_code.replace(
        "app.include_router(overrides_router, prefix=API_V2)",
        "app.include_router(overrides_router, prefix=API_V2)\napp.include_router(agencies_router, prefix=API_V2)"
    )

# Add DB Migrations
migration_sql = '''
    "CREATE TABLE IF NOT EXISTS agencies (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, contact_name VARCHAR(150), email VARCHAR(120), phone VARCHAR(20), notes VARCHAR(500), is_active BOOLEAN NOT NULL DEFAULT TRUE)",
    "CREATE TABLE IF NOT EXISTS agency_businesses (agency_id INTEGER REFERENCES agencies(id) ON DELETE CASCADE, business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE, PRIMARY KEY (agency_id, business_id))",
    "CREATE TABLE IF NOT EXISTS agency_admins (agency_id INTEGER REFERENCES agencies(id) ON DELETE CASCADE, admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE, PRIMARY KEY (agency_id, admin_id))",
'''
if "CREATE TABLE IF NOT EXISTS agencies" not in main_code:
    main_code = main_code.replace("_STARTUP_MIGRATIONS = [", "_STARTUP_MIGRATIONS = [\n" + migration_sql)

with open('platform/main.py', 'w', encoding='utf-8') as f:
    f.write(main_code)
