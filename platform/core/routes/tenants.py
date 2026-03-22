from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from core.database import get_db
from core.dependencies import require_business_admin, require_super_admin, get_current_claims
from core.models.tenant import Business, Branch
from core.models.user import Admin
from core.security import hash_password
from core.schemas.tenant import (
    BusinessCreate, BusinessUpdate, BusinessOut,
    BranchCreate, BranchUpdate, BranchOut,
)

router = APIRouter(tags=["tenants"])


@router.post("/businesses", response_model=dict, status_code=201)
def create_business(
    payload: BusinessCreate,
    claims: dict = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    if db.query(Business).filter(Business.name == payload.name).first():
        raise HTTPException(status_code=409, detail="Ya existe un negocio con ese nombre.")
    business = Business(
        name=payload.name, address=payload.address, phone=payload.phone,
        email=payload.email, country=payload.country, vertical_type=payload.vertical_type or "laundry",
    )
    db.add(business)
    db.flush()
    admin = Admin(
        username=payload.admin_username,
        password=hash_password(payload.admin_password),
        business_id=business.id,
    )
    db.add(admin)
    db.commit()
    db.refresh(business)
    return {"message": "Negocio creado.", "business": business.to_dict()}


@router.get("/businesses/{business_id}")
def get_business(
    business_id: int,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    if not claims.get("is_super_admin") and claims.get("business_id") != business_id:
        raise HTTPException(status_code=403, detail="Acceso denegado.")
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Negocio no encontrado.")
    return business.to_dict(include_branches=True)


@router.put("/businesses/{business_id}")
def update_business(
    business_id: int,
    payload: BusinessUpdate,
    claims: dict = Depends(require_business_admin),
    db: Session = Depends(get_db),
):
    if claims.get("business_id") != business_id:
        raise HTTPException(status_code=403, detail="Acceso denegado.")
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Negocio no encontrado.")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(business, field, value)
    db.commit()
    return business.to_dict()


@router.post("/branches", response_model=dict, status_code=201)
def create_branch(
    payload: BranchCreate,
    claims: dict = Depends(require_business_admin),
    db: Session = Depends(get_db),
):
    if claims.get("business_id") != payload.business_id:
        raise HTTPException(status_code=403, detail="Acceso denegado.")
    branch = Branch(
        name=payload.name, address=payload.address,
        business_id=payload.business_id, folio_prefix=payload.folio_prefix or "",
    )
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return {"message": "Sucursal creada.", "branch": branch.to_dict()}


@router.get("/branches/{branch_id}")
def get_branch(
    branch_id: int,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada.")
    if not claims.get("is_super_admin") and claims.get("business_id") != branch.business_id:
        raise HTTPException(status_code=403, detail="Acceso denegado.")
    return branch.to_dict()


@router.put("/branches/{branch_id}")
def update_branch(
    branch_id: int,
    payload: BranchUpdate,
    claims: dict = Depends(require_business_admin),
    db: Session = Depends(get_db),
):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada.")
    if claims.get("business_id") != branch.business_id:
        raise HTTPException(status_code=403, detail="Acceso denegado.")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(branch, field, value)
    db.commit()
    return branch.to_dict()


@router.get("/branches/{branch_id}/config")
def get_branch_config(
    branch_id: int,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada.")
    db.refresh(branch)
    return branch.get_config()


@router.get("/branches/{branch_id}/scan-config")
def get_scan_config(
    branch_id: int,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada.")
    db.refresh(branch)
    return {"require_scan": branch.require_scan if branch.require_scan is not None else True}


@router.patch("/branches/{branch_id}/scan-config")
def set_scan_config(
    branch_id: int,
    payload: dict,
    claims: dict = Depends(require_business_admin),
    db: Session = Depends(get_db),
):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada.")
    if claims.get("business_id") != branch.business_id:
        raise HTTPException(status_code=403, detail="Acceso denegado.")
    branch.require_scan = bool(payload.get("require_scan", True))
    db.commit()
    db.refresh(branch)
    return {"require_scan": branch.require_scan}
