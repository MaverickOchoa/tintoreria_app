from sqlalchemy import text
from core.database import SessionLocal

db = SessionLocal()
try:
    db.execute(text("ALTER TABLE orders ALTER COLUMN employee_id DROP NOT NULL;"))
    db.commit()
    print("orders.employee_id made nullable successfully.")
except Exception as e:
    db.rollback()
    print("Error:", e)
finally:
    db.close()
