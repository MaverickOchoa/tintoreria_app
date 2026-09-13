# app/models/customer.py

from app.extensions import db
from sqlalchemy import UniqueConstraint


class Customer(db.Model):
    __tablename__ = "customers"

    id = db.Column(db.Integer, primary_key=True)

    full_name = db.Column(db.String(150), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(120), nullable=True)

    notes = db.Column(db.Text, nullable=True)

    date_of_birth_day = db.Column(db.Integer, nullable=True)
    date_of_birth_month = db.Column(db.Integer, nullable=True)

    street_and_number = db.Column(db.String(255), nullable=True)
    neighborhood = db.Column(db.String(120), nullable=True)
    zip_code = db.Column(db.String(20), nullable=True)

    # Relación con negocio y sucursal
    business_id = db.Column(
        db.Integer,
        db.ForeignKey("businesses.id"),
        nullable=False,
    )

    branch_id = db.Column(
        db.Integer,
        db.ForeignKey("branches.id"),
        nullable=True,
    )

    business = db.relationship(
        "Business",
        back_populates="customers",
    )

    branch = db.relationship(
        "Branch",
        back_populates="customers",
    )

    # Teléfono único por negocio (un mismo número puede existir en OTRO negocio)
    __table_args__ = (
        UniqueConstraint("business_id", "phone", name="uq_customer_phone_business"),
    )

    def __repr__(self):
        return f"<Customer {self.full_name} ({self.phone})>"
