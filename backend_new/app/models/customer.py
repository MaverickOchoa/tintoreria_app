# app/models/customer.py

from datetime import datetime
from app.extensions import db


class Customer(db.Model):
    __tablename__ = "customers"

    id = db.Column(db.Integer, primary_key=True)

    full_name = db.Column(db.String(150), nullable=False)
    phone = db.Column(db.String(30), nullable=False)
    email = db.Column(db.String(120), nullable=True)
    notes = db.Column(db.Text, nullable=True)

    # Para campañas de cumple: solo día/mes
    birth_day = db.Column(db.Integer, nullable=True)
    birth_month = db.Column(db.Integer, nullable=True)

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

    active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Restricción: el mismo teléfono no se puede repetir en el mismo negocio
    __table_args__ = (
        db.UniqueConstraint(
            "phone",
            "business_id",
            name="uq_customer_phone_business",
        ),
    )

    # Relaciones
    business = db.relationship(
        "Business",
        back_populates="customers",
    )

    branch = db.relationship(
        "Branch",
        back_populates="customers",
    )

    def to_dict(self, include_business=False, include_branch=False):
        data = {
            "id": self.id,
            "full_name": self.full_name,
            "phone": self.phone,
            "email": self.email,
            "notes": self.notes,
            "birth_day": self.birth_day,
            "birth_month": self.birth_month,
            "business_id": self.business_id,
            "branch_id": self.branch_id,
            "active": self.active,
            "created_at": self.created_at.isoformat(),
        }

        if include_business and self.business:
            data["business"] = {
                "id": self.business.id,
                "name": self.business.name,
            }

        if include_branch and self.branch:
            data["branch"] = {
                "id": self.branch.id,
                "name": self.branch.name,
            }

        return data
