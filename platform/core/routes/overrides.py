from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from core.database import get_db
from core.security import require_business_admin, get_current_claims
from core.models.tenant import BranchItemOverride, Branch
from verticals.laundry.models import Item

router = APIRouter(tags=["overrides"])

class OverrideUpdate(BaseModel):
    price: float

@router.get("/branch-item-overrides/branch/{branch_id}/item/{item_id}")
def get_override(branch_id: int, item_id: int, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    # Check permissions if necessary
    ov = db.query(BranchItemOverride).filter(
        BranchItemOverride.branch_id == branch_id,
        BranchItemOverride.item_id == item_id
    ).first()
    if not ov:
        raise HTTPException(status_code=404, detail="Override not found")
    return {"override": ov.to_dict()}

@router.put("/branch-item-overrides/branch/{branch_id}/item/{item_id}")
def update_override(branch_id: int, item_id: int, payload: OverrideUpdate, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    ov = db.query(BranchItemOverride).filter(
        BranchItemOverride.branch_id == branch_id,
        BranchItemOverride.item_id == item_id
    ).first()
    
    if ov:
        ov.price = payload.price
    else:
        ov = BranchItemOverride(branch_id=branch_id, item_id=item_id, price=payload.price)
        db.add(ov)
        
    db.commit()
    return {"message": "Override saved", "override": ov.to_dict()}

@router.delete("/branch-item-overrides/branch/{branch_id}/item/{item_id}")
def delete_override(branch_id: int, item_id: int, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    ov = db.query(BranchItemOverride).filter(
        BranchItemOverride.branch_id == branch_id,
        BranchItemOverride.item_id == item_id
    ).first()
    if not ov:
        raise HTTPException(status_code=404, detail="Override not found")
    
    db.delete(ov)
    db.commit()
    return {"message": "Override deleted"}
