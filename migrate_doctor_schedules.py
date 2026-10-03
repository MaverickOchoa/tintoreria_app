import os
import sys

# Ensure the correct path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'platform')))

from core.database import engine
from sqlalchemy import text

def run_migration():
    print("Connecting to database...")
    with engine.connect() as conn:
        print("Dropping constraint uq_doctor_day...")
        try:
            conn.execute(text("ALTER TABLE clinic_doctor_schedules DROP CONSTRAINT uq_doctor_day;"))
            conn.commit()
            print("Successfully dropped constraint uq_doctor_day.")
        except Exception as e:
            print(f"Error dropping constraint: {e}")

if __name__ == '__main__':
    run_migration()
