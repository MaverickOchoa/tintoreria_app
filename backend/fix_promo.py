from app import app, db
from sqlalchemy import text

with app.app_context():
    sql = "ALTER TABLE promotions ADD COLUMN IF NOT EXISTS promo_type VARCHAR(20) NOT NULL DEFAULT 'bundle_price'"
    db.session.execute(text(sql))
    db.session.commit()
    cols = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='promotions'")).fetchall()
    print("Columns:", [c[0] for c in cols])
    print("Done")
