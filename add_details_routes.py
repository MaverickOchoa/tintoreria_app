import re

# 1. Update schemas
schemas_path = 'platform/verticals/laundry/schemas.py'
with open(schemas_path, 'r', encoding='utf-8') as f:
    schemas = f.read()

new_schemas = '''

class BaseNameCreate(BaseModel):
    name: str

class ColorCreate(BaseNameCreate):
    pass

class PrintCreate(BaseNameCreate):
    pass

class DefectCreate(BaseNameCreate):
    pass
'''
if "class ColorCreate" not in schemas:
    schemas += new_schemas
    with open(schemas_path, 'w', encoding='utf-8') as f:
        f.write(schemas)

# 2. Update routes
routes_path = 'platform/verticals/laundry/routes.py'
with open(routes_path, 'r', encoding='utf-8') as f:
    routes = f.read()

# Add imports if missing
if "ColorCreate" not in routes:
    routes = routes.replace(
        "ItemCreate, ItemUpdate, CategoryCreate, ServiceCreate",
        "ItemCreate, ItemUpdate, CategoryCreate, ServiceCreate, ColorCreate, PrintCreate, DefectCreate"
    )

new_routes = '''
# -------------------- DETAILS (COLORS, PRINTS, DEFECTS) --------------------

@router.get("/colors")
def list_colors(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    biz_id = claims.get("business_id")
    if not biz_id: return {"colors": []}
    colors = db.query(Color).filter(Color.business_id == biz_id).all()
    return {"colors": [c.to_dict() for c in colors]}

@router.post("/colors")
def create_color(payload: ColorCreate, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    c = Color(name=payload.name, business_id=claims["business_id"])
    db.add(c)
    db.commit()
    db.refresh(c)
    return c.to_dict()

@router.put("/colors/{id}")
def update_color(id: int, payload: ColorCreate, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    c = db.query(Color).filter(Color.id == id, Color.business_id == claims["business_id"]).first()
    if not c: raise HTTPException(status_code=404)
    c.name = payload.name
    db.commit()
    return c.to_dict()

@router.delete("/colors/{id}")
def delete_color(id: int, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    c = db.query(Color).filter(Color.id == id, Color.business_id == claims["business_id"]).first()
    if not c: raise HTTPException(status_code=404)
    db.delete(c)
    db.commit()
    return {"message": "Deleted"}

@router.get("/prints")
def list_prints(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    biz_id = claims.get("business_id")
    if not biz_id: return {"prints": []}
    prints = db.query(Print).filter(Print.business_id == biz_id).all()
    return {"prints": [p.to_dict() for p in prints]}

@router.post("/prints")
def create_print(payload: PrintCreate, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    p = Print(name=payload.name, business_id=claims["business_id"])
    db.add(p)
    db.commit()
    db.refresh(p)
    return p.to_dict()

@router.put("/prints/{id}")
def update_print(id: int, payload: PrintCreate, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    p = db.query(Print).filter(Print.id == id, Print.business_id == claims["business_id"]).first()
    if not p: raise HTTPException(status_code=404)
    p.name = payload.name
    db.commit()
    return p.to_dict()

@router.delete("/prints/{id}")
def delete_print(id: int, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    p = db.query(Print).filter(Print.id == id, Print.business_id == claims["business_id"]).first()
    if not p: raise HTTPException(status_code=404)
    db.delete(p)
    db.commit()
    return {"message": "Deleted"}

@router.get("/defects")
def list_defects(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    biz_id = claims.get("business_id")
    if not biz_id: return {"defects": []}
    defects = db.query(Defect).filter(Defect.business_id == biz_id).all()
    return {"defects": [d.to_dict() for d in defects]}

@router.post("/defects")
def create_defect(payload: DefectCreate, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    d = Defect(name=payload.name, business_id=claims["business_id"])
    db.add(d)
    db.commit()
    db.refresh(d)
    return d.to_dict()

@router.put("/defects/{id}")
def update_defect(id: int, payload: DefectCreate, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    d = db.query(Defect).filter(Defect.id == id, Defect.business_id == claims["business_id"]).first()
    if not d: raise HTTPException(status_code=404)
    d.name = payload.name
    db.commit()
    return d.to_dict()

@router.delete("/defects/{id}")
def delete_defect(id: int, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    d = db.query(Defect).filter(Defect.id == id, Defect.business_id == claims["business_id"]).first()
    if not d: raise HTTPException(status_code=404)
    db.delete(d)
    db.commit()
    return {"message": "Deleted"}
'''

if "@router.get(\"/colors\")" not in routes:
    routes += new_routes
    with open(routes_path, 'w', encoding='utf-8') as f:
        f.write(routes)
