from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base


class OrderPayment(Base):
    __tablename__ = "order_payments"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    method = Column(String(30), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    paid_at = Column(DateTime, default=datetime.utcnow)
    reference = Column(String(100), nullable=True)

    order = relationship("Order", back_populates="payments")

    def to_dict(self) -> dict:
        return {
            "id": self.id, "order_id": self.order_id,
            "method": self.method, "amount": str(self.amount),
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
            "reference": self.reference,
        }


class CashCut(Base):
    __tablename__ = "cash_cuts"

    id = Column(Integer, primary_key=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    cut_by = Column(String(120), nullable=False)
    cut_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    period_from = Column(DateTime, nullable=True)
    period_to = Column(DateTime, nullable=False)
    orders_count = Column(Integer, default=0)
    expected_cash = Column(Numeric(10, 2), default=0)
    counted_cash = Column(Numeric(10, 2), default=0)
    difference = Column(Numeric(10, 2), default=0)
    card_total = Column(Numeric(10, 2), default=0)
    points_total = Column(Numeric(10, 2), default=0)
    notes = Column(Text, nullable=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id, "branch_id": self.branch_id, "business_id": self.business_id,
            "cut_by": self.cut_by,
            "cut_at": self.cut_at.isoformat() if self.cut_at else None,
            "period_from": self.period_from.isoformat() if self.period_from else None,
            "period_to": self.period_to.isoformat() if self.period_to else None,
            "orders_count": self.orders_count,
            "expected_cash": str(self.expected_cash),
            "counted_cash": str(self.counted_cash),
            "difference": str(self.difference),
            "card_total": str(self.card_total),
            "points_total": str(self.points_total),
            "notes": self.notes,
        }
