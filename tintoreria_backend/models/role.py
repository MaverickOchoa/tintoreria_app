# app/models/role.py

from app.extensions import db

# Tabla intermedia muchos-a-muchos entre usuarios y roles
user_roles = db.Table(
    "user_roles",
    db.Column("user_id", db.Integer, db.ForeignKey("users.id"), primary_key=True),
    db.Column("role_id", db.Integer, db.ForeignKey("roles.id"), primary_key=True),
)


class Role(db.Model):
    __tablename__ = "roles"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)  # super_admin, business_admin, empleado, cliente
    description = db.Column(db.String(255), nullable=True)

    # Relación inversa se declara en User.roles (back_populates)
    users = db.relationship(
        "User",
        secondary=user_roles,
        back_populates="roles",
        lazy="dynamic",
    )

    def __repr__(self):
        return f"<Role {self.name}>"
