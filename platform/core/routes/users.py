from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from core.database import get_db
from core.dependencies import require_business_admin, get_current_claims
from core.models.user import Admin, Employee, Role
from core.security import hash_password
from core.schemas.user import EmployeeCreate, EmployeeUpdate, EmployeeOut, RoleOut

router = APIRouter(tags=["users"])


@router.get("/roles", response_model=List[RoleOut])
def list_roles(db: Session = Depends(get_db)):
    return db.query(Role).all()


@router.get("/employees")
def list_employees(
    claims: dict = Depends(require_business_admin),
    db: Session = Depends(get_db),
):
    business_id = claims["business_id"]
    employees = db.query(Employee).filter(Employee.business_id == business_id).all()
    return [e.to_dict() for e in employees]


@router.post("/employees", status_code=201)
def create_employee(
    payload: EmployeeCreate,
    claims: dict = Depends(require_business_admin),
    db: Session = Depends(get_db),
):
    business_id = claims["business_id"]
    if db.query(Employee).filter(Employee.username == payload.username).first():
        raise HTTPException(status_code=409, detail="Username ya en uso.")
    roles = db.query(Role).filter(Role.name.in_(payload.role_names)).all()
    employee = Employee(
        username=payload.username,
        password=hash_password(payload.password),
        full_name=payload.full_name,
        phone=payload.phone,
        branch_id=payload.branch_id,
        business_id=business_id,
    )
    employee.roles = roles
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee.to_dict()


@router.put("/employees/{employee_id}")
def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    claims: dict = Depends(require_business_admin),
    db: Session = Depends(get_db),
):
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.business_id == claims["business_id"],
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Empleado no encontrado.")
    update_data = payload.model_dump(exclude_none=True)
    role_names = update_data.pop("role_names", None)
    for field, value in update_data.items():
        setattr(employee, field, value)
    if role_names is not None:
        employee.roles = db.query(Role).filter(Role.name.in_(role_names)).all()
    db.commit()
    return employee.to_dict()


@router.delete("/employees/{employee_id}", status_code=204)
def delete_employee(
    employee_id: int,
    claims: dict = Depends(require_business_admin),
    db: Session = Depends(get_db),
):
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.business_id == claims["business_id"],
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Empleado no encontrado.")
    db.delete(employee)
    db.commit()
