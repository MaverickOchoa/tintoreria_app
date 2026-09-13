# backend_new/app/models/service.py

from app.extensions import db

class Service(db.Model):
    __tablename__ = "services"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)

    # relaciones
    categories = db.relationship(
        "Category",
        back_populates="service",
        cascade="all, delete-orphan",
        lazy="select",
    )
