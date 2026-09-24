import re

with open('platform/core/routes/tenants.py', 'r', encoding='utf-8') as f:
    content = f.read()

new_routes = """
@router.put("/businesses/{business_id}/config")
def update_business_config(business_id: int, payload: dict, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    if int(claims.get("business_id", 0)) != int(business_id):
        raise HTTPException(status_code=403, detail="Permiso denegado.")
    biz = db.query(Business).filter(Business.id == business_id).first()
    if not biz: raise HTTPException(status_code=404)
    if "uses_iva" in payload:
        biz.uses_iva = bool(payload["uses_iva"])
    db.commit()
    db.refresh(biz)
    return biz.to_dict()

@router.get("/businesses/{business_id}/config")
def get_business_config(business_id: int, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    biz = db.query(Business).filter(Business.id == business_id).first()
    if not biz: raise HTTPException(status_code=404)
    return {"uses_iva": biz.uses_iva}

"""

if "@router.put(\"/businesses/{business_id}/config\")" not in content:
    content += new_routes

with open('platform/core/routes/tenants.py', 'w', encoding='utf-8') as f:
    f.write(content)
