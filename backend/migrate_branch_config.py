"""
Migration: Add branch_id to hours/holidays + create branch_item_overrides table
Run: python migrate_branch_config.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from app import app, db

BRANCH_COLS = [
    ("uses_iva", "BOOLEAN"), ("payment_cash", "BOOLEAN"), ("payment_card", "BOOLEAN"),
    ("payment_points", "BOOLEAN"), ("allow_deferred", "BOOLEAN"),
    ("points_per_peso", "FLOAT"), ("peso_per_point", "FLOAT"),
    ("discount_enabled", "BOOLEAN"), ("max_discount_pct", "FLOAT"),
    ("normal_days", "INTEGER"), ("urgent_days", "INTEGER"), ("extra_urgent_days", "INTEGER"),
    ("urgent_pct", "FLOAT"), ("extra_urgent_pct", "FLOAT"),
]

with app.app_context():
    conn = db.engine.connect()

    def existing_cols(table):
        r = conn.execute(db.text(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}'"))
        return {row[0] for row in r}

    def existing_tables():
        r = conn.execute(db.text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
        return {row[0] for row in r}

    branch_cols = existing_cols('branches')
    for col, coltype in BRANCH_COLS:
        if col not in branch_cols:
            print(f"Adding branches.{col}...")
            conn.execute(db.text(f"ALTER TABLE branches ADD COLUMN {col} {coltype}"))

    promo_cols = existing_cols('promotions')
    if 'branch_id' not in promo_cols:
        print("Adding promotions.branch_id...")
        conn.execute(db.text("ALTER TABLE promotions ADD COLUMN branch_id INTEGER REFERENCES branches(id)"))

    bh_cols = existing_cols('business_hours')
    if 'branch_id' not in bh_cols:
        print("Adding business_hours.branch_id...")
        conn.execute(db.text("ALTER TABLE business_hours ADD COLUMN branch_id INTEGER REFERENCES branches(id)"))

    bhol_cols = existing_cols('business_holidays')
    if 'branch_id' not in bhol_cols:
        print("Adding business_holidays.branch_id...")
        conn.execute(db.text("ALTER TABLE business_holidays ADD COLUMN branch_id INTEGER REFERENCES branches(id)"))

    tables = existing_tables()
    if 'branch_item_overrides' not in tables:
        print("Creating branch_item_overrides table...")
        conn.execute(db.text("""
            CREATE TABLE branch_item_overrides (
                id SERIAL PRIMARY KEY,
                branch_id INTEGER NOT NULL REFERENCES branches(id),
                item_id INTEGER NOT NULL REFERENCES items(id),
                price FLOAT,
                UNIQUE(branch_id, item_id)
            )
        """))

    conn.commit()
    conn.close()
    print("Migration complete!")
