import core.models.tenant
import core.models.user
from core.database import SessionLocal
from core.models.user import Employee

db = SessionLocal()
emp = db.query(Employee).filter(Employee.username == 'huttman.ochoa').first()
print(emp.id if emp else 'Not found')
