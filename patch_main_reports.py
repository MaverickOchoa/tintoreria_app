import re

with open('platform/main.py', 'r', encoding='utf-8') as f:
    main_code = f.read()

# Add import
if "from core.routes.reports import router as reports_router" not in main_code:
    main_code = main_code.replace(
        "from core.routes.promotions import router as promotions_router",
        "from core.routes.promotions import router as promotions_router\nfrom core.routes.reports import router as reports_router"
    )

# Add include_router
if "app.include_router(reports_router, prefix=API_V2)" not in main_code:
    main_code = main_code.replace(
        "app.include_router(promotions_router, prefix=API_V2)",
        "app.include_router(promotions_router, prefix=API_V2)\napp.include_router(reports_router, prefix=API_V2)"
    )

with open('platform/main.py', 'w', encoding='utf-8') as f:
    f.write(main_code)
