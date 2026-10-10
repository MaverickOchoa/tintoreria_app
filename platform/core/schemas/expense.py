from pydantic import BaseModel
from typing import Optional
from datetime import date


class ExpenseCreate(BaseModel):
    branch_id: int
    expense_date: date
    category: str
    item_name: str
    quantity: float = 1.0
    unit: str = "pzas"
    unit_cost: float
    notes: Optional[str] = None


class ExpenseUpdate(BaseModel):
    expense_date: Optional[date] = None
    category: Optional[str] = None
    item_name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    unit_cost: Optional[float] = None
    notes: Optional[str] = None


class ExpenseOut(BaseModel):
    id: int
    business_id: int
    branch_id: int
    expense_date: str
    category: str
    item_name: str
    quantity: str
    unit: str
    unit_cost: str
    total_cost: str
    notes: Optional[str]
    created_by: str
    created_at: str

    class Config:
        from_attributes = True


class MonthlyGoalCreate(BaseModel):
    branch_id: Optional[int] = None
    year: int
    month: int
    goal_amount: float


class MonthlyGoalOut(BaseModel):
    id: int
    business_id: int
    branch_id: Optional[int]
    year: int
    month: int
    goal_amount: str

    class Config:
        from_attributes = True
