# app/models/business.py

from app.extensions import db


class Business(db.Model):
    __tablename__ = "businesses"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    address = db.Column(db.String(255), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    email = db.Column(db.String(120), nullable=True)

    # Relaciones
    branches = db.relationship(
        "Branch",
        back_populates="business",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    users = db.relationship(  # Business Admins + empleados ligados a este negocio
        "User",
        back_populates="business",
        lazy="dynamic",
    )

    customers = db.relationship(
        "Customer",
        back_populates="business",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Business {self.name}>"
