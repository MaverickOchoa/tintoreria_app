from core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
res = db.execute(text("SELECT table_name FROM information_schema.columns WHERE column_name = 'business_id' AND table_schema = 'public'"))
print("business_id:", [row[0] for row in res.fetchall()])

res = db.execute(text("SELECT table_name FROM information_schema.columns WHERE column_name = 'branch_id' AND table_schema = 'public'"))
print("branch_id:", [row[0] for row in res.fetchall()])

res = db.execute(text("SELECT table_name FROM information_schema.columns WHERE column_name = 'order_id' AND table_schema = 'public'"))
print("order_id:", [row[0] for row in res.fetchall()])
