# app/models/user.py

from app.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash
from .role import user_roles


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)

    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    full_name = db.Column(db.String(150), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    email = db.Column(db.String(120), nullable=True)

    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_super_admin = db.Column(db.Boolean, default=False, nullable=False)

    # Relaciones con negocio/sucursal
    business_id = db.Column(
        db.Integer,
        db.ForeignKey("businesses.id"),
        nullable=True,  # super_admin puede no tener negocio
    )

    branch_id = db.Column(
        db.Integer,
        db.ForeignKey("branches.id"),
        nullable=True,
    )

    business = db.relationship(
        "Business",
        back_populates="users",
    )

    branch = db.relationship(
        "Branch",
        back_populates="users",
    )

    # Roles (super_admin, business_admin, empleado, cliente futuro)
    roles = db.relationship(
        "Role",
        secondary=user_roles,
        back_populates="users",
        lazy="joined",
    )

    # --- helpers de password ---
    def set_password(self, raw_password: str):
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password: str) -> bool:
        return check_password_hash(self.password_hash, raw_password)

    # --- helpers de rol ---
    def has_role(self, role_name: str) -> bool:
        return any(r.name == role_name for r in self.roles)

    def to_safe_dict(self):
        """Datos sanos para mandar al frontend (sin password)."""
        return {
            "id": self.id,
            "username": self.username,
            "full_name": self.full_name,
            "phone": self.phone,
            "email": self.email,
            "is_active": self.is_active,
            "is_super_admin": self.is_super_admin,
            "business_id": self.business_id,
            "branch_id": self.branch_id,
            "roles": [r.name for r in self.roles],
        }

    def __repr__(self):
        return f"<User {self.username}>"
