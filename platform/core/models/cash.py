from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Numeric, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base

class CashRegister(Base):
    __tablename__ = "cash_registers"
    
    id = Column(Integer, primary_key=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    
    branch = relationship("Branch")
    shifts = relationship("CashShift", back_populates="register")
    
class CashShift(Base):
    __tablename__ = "cash_shifts"
    
    id = Column(Integer, primary_key=True)
    register_id = Column(Integer, ForeignKey("cash_registers.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    
    opened_by_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    opened_by_name = Column(String(120), nullable=True)
    closed_by_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    closed_by_name = Column(String(120), nullable=True)
    
    opened_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    closed_at = Column(DateTime, nullable=True)
    
    opening_balance = Column(Numeric(10, 2), default=0.0)
    expected_closing_balance = Column(Numeric(10, 2), nullable=True)
    actual_closing_balance = Column(Numeric(10, 2), nullable=True)
    difference = Column(Numeric(10, 2), nullable=True)
    
    status = Column(String(20), default="OPEN") # OPEN, CLOSED
    
    notes = Column(String(500), nullable=True)
    
    register = relationship("CashRegister", back_populates="shifts")
