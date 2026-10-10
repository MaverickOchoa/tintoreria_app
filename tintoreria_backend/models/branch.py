# app/models/branch.py

from app.extensions import db


class Branch(db.Model):
    __tablename__ = "branches"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    address = db.Column(db.String(255), nullable=True)

    business_id = db.Column(
        db.Integer,
        db.ForeignKey("businesses.id"),
        nullable=False,
    )

    # Relaciones
    business = db.relationship(
        "Business",
        back_populates="branches",
    )

    users = db.relationship(  # Empleados y admins asignados a esta sucursal
        "User",
        back_populates="branch",
        lazy="dynamic",
    )

    customers = db.relationship(  # Clientes que suelen usar esta sucursal
        "Customer",
        back_populates="branch",
        lazy="dynamic",
    )

    def __repr__(self):
        return f"<Branch {self.name} (business_id={self.business_id})>"
