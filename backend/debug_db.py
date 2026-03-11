import sys
sys.path.append('c:/Users/huttm/Desktop/Web Proyectys/tintoreria_app/backend')
from app import db, Admin, Employee, app

with app.app_context():
    print('--- Admins ---')
    for a in Admin.query.all():
        print(f'ID: {a.id}, Username: {a.username}, Password: {a.password}, SuperAdmin: {a.is_super_admin}')
    print('--- Employees ---')
    for e in Employee.query.all():
        print(f'ID: {e.id}, Username: {e.username}, Password: {e.password}, Active: {e.is_active}')
