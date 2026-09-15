from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, Date, Numeric, UniqueConstraint
from datetime import datetime
from core.database import Base


class MonthlyGoal(Base):
    __tablename__ = "monthly_goals"
    __table_args__ = (UniqueConstraint("business_id", "branch_id", "year", "month", name="uq_goal"),)

    id = Column(Integer, primary_key=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    goal_amount = Column(Numeric(12, 2), nullable=False, default=0)

    def to_dict(self) -> dict:
        return {
            "id": self.id, "business_id": self.business_id, "branch_id": self.branch_id,
            "year": self.year, "month": self.month, "goal_amount": str(self.goal_amount),
        }


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    expense_date = Column(Date, nullable=False)
    category = Column(String(50), nullable=False)
    item_name = Column(String(120), nullable=False)
    quantity = Column(Numeric(10, 3), nullable=False, default=1)
    unit = Column(String(20), nullable=False, default="pzas")
    unit_cost = Column(Numeric(10, 2), nullable=False, default=0)
    total_cost = Column(Numeric(12, 2), nullable=False, default=0)
    notes = Column(Text, nullable=True)
    created_by = Column(String(120), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id, "business_id": self.business_id, "branch_id": self.branch_id,
            "expense_date": self.expense_date.isoformat() if self.expense_date else None,
            "category": self.category, "item_name": self.item_name,
            "quantity": str(self.quantity), "unit": self.unit,
            "unit_cost": str(self.unit_cost), "total_cost": str(self.total_cost),
            "notes": self.notes, "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
