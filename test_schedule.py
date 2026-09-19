import sys
sys.path.append('platform')
from backend.app import app
from verticals.clinic.routes import get_doctor_schedule
from core.database import SessionLocal

db = SessionLocal()
try:
    res = get_doctor_schedule(doctor_id=1, branch_id=1, claims={"business_id": 2, "is_super_admin": False}, db=db)
    print("Success:", res)
except Exception as e:
    import traceback
    traceback.print_exc()
