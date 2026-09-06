# app/commands.py

from flask import Blueprint
from werkzeug.security import generate_password_hash
from app.extensions import db
from app.models.user import User

commands_bp = Blueprint("commands", __name__)

@commands_bp.cli.command("create-superadmin")
def create_superadmin():
    """
    Crea un Super Admin manualmente.
    """
    username = input("Username del super admin: ").strip()
    password = input("Password del super admin: ").strip()

    existing = User.query.filter_by(username=username).first()
    if existing:
        print("❌ Ya existe un usuario con ese username.")
        return

    user = User(
        username=username,
        password_hash=generate_password_hash(password),
        role="super_admin",
        business_id=None
    )

    db.session.add(user)
    db.session.commit()

    print("✅ Super Admin creado exitosamente.")
