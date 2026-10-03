from app.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)

    # username FINAL, ya con @Sucursal
    username = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    # Super Admin no pertenece a business
    is_superadmin = db.Column(db.Boolean, default=False, nullable=False)

    # Si NO es superadmin, puede estar asociado a un negocio
    business_id = db.Column(
        db.Integer,
        db.ForeignKey("businesses.id", name="fk_user_business_id", ondelete="SET NULL"),
        nullable=True,
    )

    # NUEVO: rol simple (no RBAC por ahora)
    # "business_admin" | "branch_manager" | "employee"
    role = db.Column(db.String(40), nullable=True)

    # NUEVO: sucursal asignada (para branch_manager / employee)
    branch_id = db.Column(
        db.Integer,
        db.ForeignKey("branches.id", name="fk_user_branch_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationship: usuario trabaja dentro del negocio
    business = db.relationship("Business", foreign_keys=[business_id], back_populates="users")

    # Relationship: usuario dueño del negocio
    owned_business = db.relationship(
        "Business",
        foreign_keys="Business.owner_user_id",
        back_populates="owner",
        uselist=False,
    )

    def set_password(self, raw_password: str):
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password: str) -> bool:
        return check_password_hash(self.password_hash, raw_password)
