from core.database import SessionLocal
from sqlalchemy import text
db = SessionLocal()

def get_tables(col):
    res = db.execute(text(f"SELECT table_name FROM information_schema.columns WHERE column_name = '{col}' AND table_schema = 'public'"))
    return [r[0] for r in res.fetchall()]

print("client_id:", get_tables('client_id'))
print("employee_id:", get_tables('employee_id'))
print("patient_id:", get_tables('patient_id'))
