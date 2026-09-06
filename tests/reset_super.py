import sys
sys.path.insert(0, r"C:\Users\huttm\Desktop\tontoreria2.0\backend")
from app import app, db, Admin
from werkzeug.security import generate_password_hash

with app.app_context():
    admins = Admin.query.filter_by(is_super_admin=True).all()
    print(f"Super admins en BD ({len(admins)}):")
    for a in admins:
        print(f"  id={a.id}  username='{a.username}'")

    # Crear o actualizar usuario 'hut' con password 'hut'
    hut = Admin.query.filter_by(username="hut").first()
    if hut:
        hut.password = generate_password_hash("hut")
        hut.is_super_admin = True
        db.session.commit()
        print("\nUsuario 'hut' actualizado — password: hut")
    else:
        new = Admin(username="hut", password=generate_password_hash("hut"),
                    is_super_admin=True, business_id=None, branch_id=None)
        db.session.add(new)
        db.session.commit()
        print("\nUsuario 'hut' creado — password: hut")
