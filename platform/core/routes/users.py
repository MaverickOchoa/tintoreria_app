import os
import re
import unicodedata
import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from core.database import get_db
from core.dependencies import require_business_admin, get_current_claims
from core.models.user import Admin, Employee, Role
from core.security import hash_password, verify_password
from core.schemas.user import (
    EmployeeCreate, EmployeeUpdate, EmployeeOut,
    ChangePasswordRequest, RoleOut,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["users"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://zentro-5b3g.onrender.com")


def _slugify(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text)
    ascii_text = nfkd.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]", "", ascii_text.lower())


def _generate_username(first: str, last: str, db: Session) -> str:
    base = f"{_slugify(first)}.{_slugify(last)}" if last else _slugify(first)
    username = base
    count = 1
    while db.query(Employee).filter(Employee.username == username).first():
        username = f"{base}{count}"
        count += 1
    return username


def _send_staff_credentials(email: str, full_name: str, username: str, password: str):
    api_key = os.getenv("SENDGRID_API_KEY")
    sender  = os.getenv("SENDGRID_FROM_EMAIL", "huttmanochoa@gmail.com")
    if not api_key:
        logger.warning("SENDGRID_API_KEY not set — skipping staff email")
        return
    portal_url = f"{FRONTEND_URL}/#/clinic/login"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;padding:24px;border:1px solid #e0e0e0;border-radius:8px">
      <h2 style="color:#1565c0">Bienvenido a Zentro Clinic</h2>
      <p>Hola <strong>{full_name}</strong>,</p>
      <p>Tu cuenta ha sido creada. Aquí están tus credenciales de acceso:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;background:#f5f5f5;border-radius:4px 0 0 4px;color:#555">Usuario</td>
            <td style="padding:8px;background:#e3f2fd;font-weight:bold">{username}</td></tr>
        <tr><td style="padding:8px;background:#f5f5f5;border-radius:4px 0 0 4px;color:#555">Contraseña temporal</td>
            <td style="padding:8px;background:#e3f2fd;font-weight:bold">{password}</td></tr>
      </table>
      <p style="color:#e53935;font-size:13px">Al ingresar por primera vez se te pedirá cambiar tu contraseña.</p>
      <a href="{portal_url}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#1565c0;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold">
        Iniciar Sesión
      </a>
      <p style="margin-top:24px;font-size:12px;color:#999">Zentro Clinic · Powered by Zentro</p>
    </div>
    """
    message = Mail(
        from_email=sender,
        to_emails=email,
        subject="Bienvenido a Zentro Clinic — Tus credenciales",
        html_content=html,
    )
    try:
        sg = SendGridAPIClient(api_key)
        sg.send(message)
    except Exception as exc:
        logger.error(f"Failed to send staff credentials to {email}: {exc}")


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

    username = _generate_username(payload.full_name, payload.last_name or "", db)
    temp_password = payload.phone.strip() if payload.phone else "zentro2024"

    roles = db.query(Role).filter(Role.name.in_(payload.role_names)).all()
    employee = Employee(
        username=username,
        password=hash_password(temp_password),
        full_name=payload.full_name,
        last_name=payload.last_name,
        email=payload.email,
        phone=payload.phone,
        specialty=payload.specialty,
        branch_id=payload.branch_id,
        business_id=business_id,
        must_change_password=True,
    )
    employee.roles = roles
    db.add(employee)
    db.commit()
    db.refresh(employee)

    _send_staff_credentials(
        email=payload.email,
        full_name=f"{payload.full_name} {payload.last_name or ''}".strip(),
        username=username,
        password=temp_password,
    )

    return employee.to_dict()


@router.put("/employees/change-password", status_code=200)
def change_password(
    payload: ChangePasswordRequest,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    employee = db.query(Employee).filter(Employee.id == claims["sub"]).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Empleado no encontrado.")
    if not verify_password(payload.current_password, employee.password):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta.")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 6 caracteres.")
    employee.password = hash_password(payload.new_password)
    employee.must_change_password = False
    db.commit()
    return {"message": "Contraseña actualizada correctamente."}


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
