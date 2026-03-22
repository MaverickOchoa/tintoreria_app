from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, UniqueConstraint, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base


class ClientType(Base):
    __tablename__ = "client_types"
    __table_args__ = (UniqueConstraint("name", "business_id", name="_client_type_business_uc"),)

    id = Column(Integer, primary_key=True)
    name = Column(String(60), nullable=False)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)

    def to_dict(self) -> dict:
        return {"id": self.id, "name": self.name, "business_id": self.business_id}


class Client(Base):
    __tablename__ = "clients"
    __table_args__ = (UniqueConstraint("phone", name="_phone_uc"),)

    id = Column(Integer, primary_key=True)
    full_name = Column(String(150), nullable=False)
    last_name = Column(String(150), nullable=True)
    street_and_number = Column(String(255), nullable=True)
    neighborhood = Column(String(100), nullable=True)
    zip_code = Column(String(20), nullable=True)
    phone = Column(String(20), nullable=False, index=True)
    email = Column(String(120), nullable=True)
    notes = Column(Text, nullable=True)
    date_of_birth_day = Column(Integer, nullable=True)
    date_of_birth_month = Column(Integer, nullable=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    client_type_id = Column(Integer, ForeignKey("client_types.id"), nullable=True)
    username = Column(String(80), unique=True, nullable=True)
    password = Column(String(255), nullable=True)
    consent_whatsapp = Column(Boolean, default=False, nullable=False, server_default="false")
    consent_email = Column(Boolean, default=False, nullable=False, server_default="false")
    points_balance = Column(Float, nullable=False, default=0.0)

    client_type = relationship("ClientType", backref="clients")
    discounts = relationship("ClientDiscount", back_populates="client", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.id, "full_name": self.full_name, "last_name": self.last_name,
            "phone": self.phone, "email": self.email, "notes": self.notes,
            "street_and_number": self.street_and_number, "neighborhood": self.neighborhood,
            "zip_code": self.zip_code,
            "date_of_birth_day": self.date_of_birth_day,
            "date_of_birth_month": self.date_of_birth_month,
            "branch_id": self.branch_id,
            "client_type_id": self.client_type_id,
            "client_type_name": self.client_type.name if self.client_type else None,
            "username": self.username,
            "points_balance": self.points_balance,
            "consent_whatsapp": self.consent_whatsapp,
            "consent_email": self.consent_email,
            "has_portal_access": bool(self.username and self.password),
        }


class ClientDiscount(Base):
    __tablename__ = "client_discounts"

    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    discount_pct = Column(Float, nullable=False)
    reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="discounts")

    def to_dict(self) -> dict:
        return {
            "id": self.id, "client_id": self.client_id,
            "discount_pct": self.discount_pct, "reason": self.reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
