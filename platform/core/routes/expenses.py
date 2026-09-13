from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date, timedelta
from core.database import get_db
from core.dependencies import get_current_claims
from core.models.expense import Expense, MonthlyGoal
from core.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseOut, MonthlyGoalCreate, MonthlyGoalOut

router = APIRouter(tags=["expenses"])


@router.get("/expenses")
def list_expenses(
    branch_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    category: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    business_id = claims.get("business_id")
    q = db.query(Expense).filter(Expense.business_id == business_id)
    if branch_id:
        q = q.filter(Expense.branch_id == branch_id)
    if date_from:
        q = q.filter(Expense.expense_date >= date_from)
    if date_to:
        q = q.filter(Expense.expense_date <= date_to)
    if category:
        q = q.filter(Expense.category == category)
    total = q.count()
    sum_total = q.with_entities(func.sum(Expense.total_cost)).scalar() or 0
    expenses = q.order_by(Expense.expense_date.desc()).offset(offset).limit(limit).all()
    return {
        "total": total,
        "sum_total_cost": str(sum_total),
        "expenses": [e.to_dict() for e in expenses],
    }


@router.post("/expenses", status_code=201)
def create_expense(
    payload: ExpenseCreate,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    business_id = claims.get("business_id")
    total_cost = float(payload.quantity) * float(payload.unit_cost)
    expense = Expense(
        business_id=business_id,
        branch_id=payload.branch_id,
        expense_date=payload.expense_date,
        category=payload.category,
        item_name=payload.item_name,
        quantity=payload.quantity,
        unit=payload.unit,
        unit_cost=payload.unit_cost,
        total_cost=total_cost,
        notes=payload.notes,
        created_by=claims.get("sub", "unknown"),
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense.to_dict()


@router.put("/expenses/{expense_id}")
def update_expense(
    expense_id: int,
    payload: ExpenseUpdate,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.business_id == claims.get("business_id"),
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado.")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(expense, field, value)
    expense.total_cost = float(expense.quantity) * float(expense.unit_cost)
    db.commit()
    return expense.to_dict()


@router.delete("/expenses/{expense_id}", status_code=204)
def delete_expense(
    expense_id: int,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.business_id == claims.get("business_id"),
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado.")
    db.delete(expense)
    db.commit()


@router.get("/goals")
def get_goals(
    year: int,
    month: int,
    branch_id: Optional[int] = None,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    business_id = claims.get("business_id")
    branch_goal = None
    global_goal = None
    if branch_id:
        branch_goal = db.query(MonthlyGoal).filter_by(
            business_id=business_id, branch_id=branch_id, year=year, month=month
        ).first()
    global_goal = db.query(MonthlyGoal).filter_by(
        business_id=business_id, branch_id=None, year=year, month=month
    ).first()
    return {
        "branch_goal": branch_goal.to_dict() if branch_goal else None,
        "global_goal": global_goal.to_dict() if global_goal else None,
    }


@router.post("/goals", status_code=201)
def upsert_goal(
    payload: MonthlyGoalCreate,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    business_id = claims.get("business_id")
    goal = db.query(MonthlyGoal).filter_by(
        business_id=business_id, branch_id=payload.branch_id,
        year=payload.year, month=payload.month,
    ).first()
    if goal:
        goal.goal_amount = payload.goal_amount
    else:
        goal = MonthlyGoal(
            business_id=business_id, branch_id=payload.branch_id,
            year=payload.year, month=payload.month, goal_amount=payload.goal_amount,
        )
        db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal.to_dict()
