from app.extensions import db
from datetime import datetime

# ------------------------------------------
# Tabla intermedia User ↔ Role (Many-To-Many)
# ------------------------------------------
user_roles = db.Table(
    "user_roles",
    db.Column("user_id", db.Integer, db.ForeignKey("users.id"), primary_key=True),
    db.Column("role_id", db.Integer, db.ForeignKey("roles.id"), primary_key=True),
)


class Role(db.Model):
    __tablename__ = "roles"

    id = db.Column(db.Integer, primary_key=True)

    # Nombre del rol: "super_admin", "business_admin", "gerente", "empleado"
    name = db.Column(db.String(50), unique=True, nullable=False)

    # Descripción opcional del rol
    description = db.Column(db.String(255))

    # Usuarios asignados a este rol
    users = db.relationship(
        "User",
        secondary=user_roles,
        back_populates="roles",
        lazy="subquery"
    )

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Role {self.name}>"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
        }
