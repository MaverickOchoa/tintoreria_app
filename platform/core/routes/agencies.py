from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from core.database import get_db
from core.security import require_super_admin, get_password_hash
from core.models.agency import Agency, AgencyBusiness, AgencyAdminUser
from core.models.tenant import Business
from core.models.user import Admin

router = APIRouter(tags=["agencies"])

class AgencyCreate(BaseModel):
    name: str
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None

class AgencyUpdate(BaseModel):
    name: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class AdminCreate(BaseModel):
    username: str
    password: str

@router.get("/agencies")
def list_agencies(claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    agencies = db.query(Agency).all()
    results = []
    for ag in agencies:
        b_count = db.query(AgencyBusiness).filter(AgencyBusiness.agency_id == ag.id).count()
        a_count = db.query(AgencyAdminUser).filter(AgencyAdminUser.agency_id == ag.id).count()
        d = ag.to_dict()
        d["business_count"] = b_count
        d["admin_count"] = a_count
        results.append(d)
    return {"agencies": results}

@router.get("/agencies/{agency_id}")
def get_agency(agency_id: int, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    ag = db.query(Agency).filter(Agency.id == agency_id).first()
    if not ag: raise HTTPException(status_code=404)
    
    # Get businesses
    biz_links = db.query(AgencyBusiness).filter(AgencyBusiness.agency_id == agency_id).all()
    biz_ids = [b.business_id for b in biz_links]
    businesses = db.query(Business).filter(Business.id.in_(biz_ids)).all()
    
    # Get admins
    adm_links = db.query(AgencyAdminUser).filter(AgencyAdminUser.agency_id == agency_id).all()
    adm_ids = [a.admin_id for a in adm_links]
    admins = db.query(Admin).filter(Admin.id.in_(adm_ids)).all()
    
    res = ag.to_dict()
    res["businesses"] = [b.to_dict() for b in businesses]
    res["admins"] = [{"id": a.id, "username": a.username} for a in admins]
    
    return res

@router.post("/agencies", status_code=201)
def create_agency(payload: AgencyCreate, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    ag = Agency(**payload.model_dump())
    db.add(ag)
    db.commit()
    db.refresh(ag)
    return ag.to_dict()

@router.put("/agencies/{agency_id}")
def update_agency(agency_id: int, payload: AgencyUpdate, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    ag = db.query(Agency).filter(Agency.id == agency_id).first()
    if not ag: raise HTTPException(status_code=404)
    
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(ag, k, v)
    
    db.commit()
    return ag.to_dict()

@router.delete("/agencies/{agency_id}")
def delete_agency(agency_id: int, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    ag = db.query(Agency).filter(Agency.id == agency_id).first()
    if not ag: raise HTTPException(status_code=404)
    db.delete(ag)
    db.commit()
    return {"message": "Agency deleted"}

@router.post("/agencies/{agency_id}/create-admin")
def create_agency_admin(agency_id: int, payload: AdminCreate, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    # Create the admin user
    hashed = get_password_hash(payload.password)
    admin = Admin(username=payload.username, password=hashed)
    db.add(admin)
    db.commit()
    db.refresh(admin)
    
    # Link to agency
    link = AgencyAdminUser(agency_id=agency_id, admin_id=admin.id)
    db.add(link)
    db.commit()
    
    return {"message": "Admin created"}

@router.post("/agencies/{agency_id}/assign-business")
def assign_business_to_agency(agency_id: int, business_id: int, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    # Ensure it's not already linked
    existing = db.query(AgencyBusiness).filter_by(agency_id=agency_id, business_id=business_id).first()
    if not existing:
        link = AgencyBusiness(agency_id=agency_id, business_id=business_id)
        db.add(link)
        db.commit()
    return {"message": "Business assigned"}

@router.delete("/agencies/{agency_id}/remove-business/{business_id}")
def remove_business_from_agency(agency_id: int, business_id: int, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    link = db.query(AgencyBusiness).filter_by(agency_id=agency_id, business_id=business_id).first()
    if link:
        db.delete(link)
        db.commit()
    return {"message": "Business removed"}
