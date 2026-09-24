import re

with open('platform/core/routes/tenants.py', 'r', encoding='utf-8') as f:
    content = f.read()

new_routes = """
@router.put("/businesses/{business_id}/toggle")
def toggle_business(business_id: int, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    biz = db.query(Business).filter(Business.id == business_id).first()
    if not biz: raise HTTPException(status_code=404)
    biz.is_active = not biz.is_active
    db.commit()
    db.refresh(biz)
    return biz.to_dict()

@router.put("/branches/{branch_id}/toggle")
def toggle_branch(branch_id: int, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch: raise HTTPException(status_code=404)
    branch.is_active = not branch.is_active
    db.commit()
    db.refresh(branch)
    return branch.to_dict()

@router.put("/branches/{branch_id}/folio")
def update_branch_folio(branch_id: int, payload: dict, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch: raise HTTPException(status_code=404)
    if "folio_prefix" in payload:
        branch.folio_prefix = str(payload["folio_prefix"]).strip()[:20]
    if "folio_counter" in payload:
        branch.folio_counter = max(0, int(payload["folio_counter"]))
    db.commit()
    db.refresh(branch)
    return branch.to_dict()

@router.put("/branches/{branch_id}/config")
def update_branch_config(branch_id: int, payload: dict, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch: raise HTTPException(status_code=404)
    cfg = branch.get_config()
    cfg["payment_points"] = payload.get("payment_points", cfg.get("payment_points", False))
    cfg["points_per_peso"] = float(payload.get("points_per_peso", cfg.get("points_per_peso", 0.0)))
    cfg["uses_iva"] = payload.get("uses_iva", cfg.get("uses_iva", False))
    cfg["discount_enabled"] = payload.get("discount_enabled", cfg.get("discount_enabled", True))
    branch.set_config(cfg)
    db.commit()
    db.refresh(branch)
    return branch.to_dict()

@router.put("/branches/{branch_id}/scan-config")
def update_branch_scan_config(branch_id: int, payload: dict, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch: raise HTTPException(status_code=404)
    if "require_scan" in payload:
        branch.require_scan = bool(payload["require_scan"])
    db.commit()
    db.refresh(branch)
    return {"require_scan": bool(branch.require_scan), "branch_id": branch.id}

@router.get("/branches/{branch_id}/config")
def get_branch_config(branch_id: int, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch: raise HTTPException(status_code=404)
    return branch.get_config()

@router.get("/branches/{branch_id}/folio")
def get_branch_folio(branch_id: int, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch: raise HTTPException(status_code=404)
    # The frontend expects {"folio": "..."}
    prefix = branch.folio_prefix or ""
    counter = (branch.folio_counter or 0) + 1
    folio = f"{prefix}{str(counter).zfill(4)}" if prefix else str(counter).zfill(4)
    return {"folio": folio}

"""

if "@router.put(\"/branches/{branch_id}/folio\")" not in content:
    content += new_routes

with open('platform/core/routes/tenants.py', 'w', encoding='utf-8') as f:
    f.write(content)
