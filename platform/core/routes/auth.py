from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import verify_password, create_access_token
from core.models.user import Admin, Employee
from core.models.tenant import Business, Branch
from core.schemas.auth import LoginRequest, TokenResponse, SelectBranchRequest
from core.dependencies import get_current_claims

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(Admin).filter(Admin.username == payload.username).first()
    if user and verify_password(payload.password, user.password):
        if user.is_super_admin:
            token_data = {"sub": user.username, "is_super_admin": True}
            return TokenResponse(
                access_token=create_access_token(token_data),
                role="super_admin",
            )
        business = db.query(Business).filter(Business.id == user.business_id).first()
        token_data = {
            "sub": user.username,
            "is_super_admin": False,
            "business_id": user.business_id,
            "active_branch_id": user.branch_id,
            "vertical_type": business.vertical_type if business else "laundry",
        }
        return TokenResponse(
            access_token=create_access_token(token_data),
            role="business_admin",
            business_id=user.business_id,
            branch_id=user.branch_id,
            vertical_type=business.vertical_type if business else "laundry",
        )

    employee = db.query(Employee).filter(Employee.username == payload.username).first()
    if employee and verify_password(payload.password, employee.password):
        if not employee.is_active:
            raise HTTPException(status_code=403, detail="Empleado inactivo.")
        business = db.query(Business).filter(Business.id == employee.business_id).first()
        role_names = [r.name for r in employee.roles]
        token_data = {
            "sub": employee.username,
            "is_super_admin": False,
            "business_id": employee.business_id,
            "branch_id": employee.branch_id,
            "employee_id": employee.id,
            "roles": role_names,
            "vertical_type": business.vertical_type if business else "laundry",
        }
        return TokenResponse(
            access_token=create_access_token(token_data),
            role=role_names[0] if role_names else "employee",
            business_id=employee.business_id,
            branch_id=employee.branch_id,
            vertical_type=business.vertical_type if business else "laundry",
            full_name=employee.full_name,
        )

    raise HTTPException(status_code=401, detail="Credenciales inválidas.")


@router.post("/select-branch", response_model=TokenResponse)
def select_branch(
    payload: SelectBranchRequest,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    if claims.get("is_super_admin"):
        raise HTTPException(status_code=400, detail="Super admin no selecciona sucursal.")
    business_id = claims.get("business_id")
    branch = db.query(Branch).filter(
        Branch.id == payload.branch_id,
        Branch.business_id == business_id,
    ).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada.")
    business = db.query(Business).filter(Business.id == business_id).first()
    new_claims = {**claims, "active_branch_id": payload.branch_id}
    return TokenResponse(
        access_token=create_access_token(new_claims),
        role="business_admin",
        business_id=business_id,
        branch_id=payload.branch_id,
        vertical_type=business.vertical_type if business else "laundry",
    )
