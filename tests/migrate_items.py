import sys
sys.path.insert(0, r"C:\Users\huttm\Desktop\tontoreria2.0\backend")
from app import app, db
from sqlalchemy import text

with app.app_context():
    with db.engine.connect() as conn:
        # Check current columns
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'items'
        """))
        cols = [r[0] for r in result]
        print("Current columns:", cols)

        if 'branch_id' in cols and 'business_id' not in cols:
            conn.execute(text("ALTER TABLE items ADD COLUMN business_id INTEGER REFERENCES businesses(id)"))
            conn.execute(text("""
                UPDATE items SET business_id = (
                    SELECT b.business_id FROM branches b WHERE b.id = items.branch_id
                ) WHERE branch_id IS NOT NULL
            """))
            conn.execute(text("ALTER TABLE items DROP COLUMN branch_id"))
            conn.commit()
            print("Migration done: branch_id -> business_id")
        elif 'business_id' in cols:
            print("Already migrated: business_id column exists")
        else:
            conn.execute(text("ALTER TABLE items ADD COLUMN business_id INTEGER REFERENCES businesses(id)"))
            conn.commit()
            print("Added business_id column")
