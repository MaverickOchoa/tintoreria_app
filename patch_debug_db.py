import re

with open('platform/verticals/homeschool/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

target = """@router.get("/debug-db")
def debug_db():
    try:
        from core.database import engine, Base
        from verticals.homeschool import models as hs_models
        Base.metadata.create_all(bind=engine)
        return {"status": "success", "message": "Tables created successfully"}
    except Exception as e:
        import traceback
        return {"status": "error", "error": str(e), "traceback": traceback.format_exc()}"""

replacement = """@router.get("/debug-db")
def debug_db():
    try:
        from core.database import engine, Base
        from verticals.homeschool import models as hs_models
        Base.metadata.create_all(bind=engine)
        
        # Also run migrations
        from main import _STARTUP_MIGRATIONS
        from sqlalchemy import text
        results = []
        with engine.connect() as conn:
            for stmt in _STARTUP_MIGRATIONS:
                try:
                    conn.execute(text("SET lock_timeout = '10s';"))
                    conn.execute(text(stmt))
                    conn.commit()
                    results.append({"stmt": stmt, "status": "ok"})
                except Exception as ex:
                    conn.rollback()
                    results.append({"stmt": stmt, "status": "error", "error": str(ex)})
                    
        return {"status": "success", "message": "Tables created successfully", "migrations": results}
    except Exception as e:
        import traceback
        return {"status": "error", "error": str(e), "traceback": traceback.format_exc()}"""

content = content.replace(target, replacement)

with open('platform/verticals/homeschool/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
