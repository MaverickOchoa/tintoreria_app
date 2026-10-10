from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, Boolean, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base


class PromoRequiredLine(Base):
    __tablename__ = "promo_required_lines"

    id = Column(Integer, primary_key=True)
    promo_id = Column(Integer, ForeignKey("promotions.id", ondelete="CASCADE"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=True)
    quantity = Column(Integer, nullable=False, default=1)

    item = relationship("Item", lazy=True)
    category = relationship("Category", lazy=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id, "item_id": self.item_id,
            "item_name": self.item.name if self.item else None,
            "category_id": self.category_id,
            "category_name": self.category.name if self.category else None,
            "quantity": self.quantity,
        }


class PromoRewardLine(Base):
    __tablename__ = "promo_reward_lines"

    id = Column(Integer, primary_key=True)
    promo_id = Column(Integer, ForeignKey("promotions.id", ondelete="CASCADE"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)

    item = relationship("Item", lazy=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id, "item_id": self.item_id,
            "item_name": self.item.name if self.item else None,
            "quantity": self.quantity,
        }


class Promotion(Base):
    __tablename__ = "promotions"

    id = Column(Integer, primary_key=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    client_type_id = Column(Integer, ForeignKey("client_types.id"), nullable=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=True)
    title = Column(String(120), nullable=False)
    description = Column(Text, nullable=True)
    promo_type = Column(String(20), nullable=False, default="bundle_price")
    bundle_price = Column(Float, nullable=True)
    discount_pct = Column(Float, nullable=True)
    active = Column(Boolean, default=True, nullable=False)
    starts_at = Column(DateTime, nullable=True)
    ends_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    client_type = relationship("ClientType", backref="promotions")
    service = relationship("Service", lazy=True)
    required_lines = relationship("PromoRequiredLine", backref="promotion", cascade="all, delete-orphan",
                                  foreign_keys="PromoRequiredLine.promo_id")
    reward_lines = relationship("PromoRewardLine", backref="promotion", cascade="all, delete-orphan",
                                foreign_keys="PromoRewardLine.promo_id")

    def is_valid_now(self) -> bool:
        now = datetime.utcnow()
        if self.starts_at and now < self.starts_at:
            return False
        if self.ends_at and now > self.ends_at:
            return False
        return self.active

    def to_dict(self) -> dict:
        return {
            "id": self.id, "business_id": self.business_id, "branch_id": self.branch_id,
            "client_type_id": self.client_type_id,
            "client_type_name": self.client_type.name if self.client_type else None,
            "service_id": self.service_id,
            "service_name": self.service.name if self.service else None,
            "title": self.title, "description": self.description,
            "promo_type": self.promo_type, "bundle_price": self.bundle_price,
            "discount_pct": self.discount_pct, "active": self.active,
            "starts_at": self.starts_at.isoformat() if self.starts_at else None,
            "ends_at": self.ends_at.isoformat() if self.ends_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "required_lines": [l.to_dict() for l in self.required_lines],
            "reward_lines": [l.to_dict() for l in self.reward_lines],
        }
