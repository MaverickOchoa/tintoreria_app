import re

with open('platform/main.py', 'r', encoding='utf-8') as f:
    main_code = f.read()

# Add import
if "from core.routes.overrides import router as overrides_router" not in main_code:
    main_code = main_code.replace(
        "from core.routes.expenses import router as expenses_router",
        "from core.routes.expenses import router as expenses_router\nfrom core.routes.overrides import router as overrides_router"
    )

# Add include_router
if "app.include_router(overrides_router, prefix=API_V2)" not in main_code:
    main_code = main_code.replace(
        "app.include_router(expenses_router, prefix=API_V2)",
        "app.include_router(expenses_router, prefix=API_V2)\napp.include_router(overrides_router, prefix=API_V2)"
    )

with open('platform/main.py', 'w', encoding='utf-8') as f:
    f.write(main_code)
