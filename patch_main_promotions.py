import re

with open('platform/main.py', 'r', encoding='utf-8') as f:
    main_code = f.read()

# Add import
if "from core.routes.promotions import router as promotions_router" not in main_code:
    main_code = main_code.replace(
        "from core.routes.agencies import router as agencies_router",
        "from core.routes.agencies import router as agencies_router\nfrom core.routes.promotions import router as promotions_router"
    )

# Add include_router
if "app.include_router(promotions_router, prefix=API_V2)" not in main_code:
    main_code = main_code.replace(
        "app.include_router(agencies_router, prefix=API_V2)",
        "app.include_router(agencies_router, prefix=API_V2)\napp.include_router(promotions_router, prefix=API_V2)"
    )

# Add DB Migrations
migration_sql = '''
    "CREATE TABLE IF NOT EXISTS whatsapp_templates (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, template_text TEXT NOT NULL, business_id INTEGER REFERENCES businesses(id))",
    "CREATE TABLE IF NOT EXISTS email_templates (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, subject VARCHAR(200) NOT NULL, body_html TEXT NOT NULL, business_id INTEGER REFERENCES businesses(id))",
    "CREATE TABLE IF NOT EXISTS trigger_channel_config (id SERIAL PRIMARY KEY, trigger_type VARCHAR(50) NOT NULL, channel VARCHAR(50) NOT NULL, template_id INTEGER NOT NULL, business_id INTEGER REFERENCES businesses(id))",
    "CREATE TABLE IF NOT EXISTS date_campaigns (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, send_date DATE NOT NULL, client_type_id INTEGER, channel VARCHAR(50) NOT NULL, template_id INTEGER NOT NULL, is_sent BOOLEAN DEFAULT FALSE, business_id INTEGER REFERENCES businesses(id))",
'''
if "CREATE TABLE IF NOT EXISTS whatsapp_templates" not in main_code:
    main_code = main_code.replace("_STARTUP_MIGRATIONS = [", "_STARTUP_MIGRATIONS = [\n" + migration_sql)

with open('platform/main.py', 'w', encoding='utf-8') as f:
    f.write(main_code)
