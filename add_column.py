from backend.app import app, db
from sqlalchemy import text

with app.app_context():
    try:
        with db.engine.connect() as conn:
            conn.execute(text("ALTER TABLE employees ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;"))
            conn.commit()
        print("Column is_active added successfully.")
    except Exception as e:
        print(f"Error (might already exist): {e}")
