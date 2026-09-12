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

    for k, v in payload.dict(exclude_unset=True).items():
        setattr(business, k, v)
    db.commit()
    db.refresh(business)
    return {"message": "Negocio actualizado.", "business": business.to_dict()}


@router.get("/businesses/{business_id}/public")
def get_public_business(business_id: int, db: Session = Depends(get_db)):
    """Devuelve la configuración pública (colores, logo) para el portal de pacientes."""
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Negocio no encontrado.")
    return {
        "id": business.id,
        "name": business.name,
        "portal_primary_color": business.portal_primary_color,
        "portal_bg_color": business.portal_bg_color,
        "portal_logo_url": business.portal_logo_url,
        "portal_slogan": business.portal_slogan
    }


from fastapi import UploadFile, File
import os, requests


@router.post("/businesses/{business_id}/logo")
async def upload_business_logo(
    business_id: int,
    file: UploadFile = File(...),
    claims: dict = Depends(require_business_admin),
    db: Session = Depends(get_db),
):
    if claims.get("business_id") != business_id:
        raise HTTPException(status_code=403, detail="Acceso denegado.")
    
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Negocio no encontrado.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Archivo vacío.")

    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    api_key    = os.getenv("CLOUDINARY_API_KEY", "")
    api_secret = os.getenv("CLOUDINARY_API_SECRET", "")

    if not cloud_name or not api_key or not api_secret:
        raise HTTPException(status_code=500, detail="Cloudinary no configurado.")

    import cloudinary
    import cloudinary.uploader
    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret
    )

    public_id = f"business_{business_id}_logo"

    try:
        res = cloudinary.uploader.upload(
            file_bytes,
            public_id=public_id,
            resource_type="image",
            overwrite=True
        )
        logo_url = res.get("secure_url")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error subiendo a Cloudinary: {str(e)}")
    
    business.portal_logo_url = logo_url
    db.commit()
    
    return {"message": "Logo subido exitosamente", "logo_url": logo_url}


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
