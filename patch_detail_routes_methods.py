import re

with open('platform/verticals/laundry/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace POST, PUT, DELETE for Color, Print, Defect
pattern_colors = r'''@router\.post\("/colors"\)
def create_color\(payload: ColorCreate, claims: dict = Depends\(require_business_admin\), db: Session = Depends\(get_db\)\):
    c = Color\(name=payload\.name, business_id=claims\["business_id"\]\)
    db\.add\(c\)
    db\.commit\(\)
    db\.refresh\(c\)
    return c\.to_dict\(\)

@router\.put\("/colors/\{id\}"\)
def update_color\(id: int, payload: ColorCreate, claims: dict = Depends\(require_business_admin\), db: Session = Depends\(get_db\)\):
    c = db\.query\(Color\)\.filter\(Color\.id == id, Color\.business_id == claims\["business_id"\]\)\.first\(\)
    if not c: raise HTTPException\(status_code=404\)
    c\.name = payload\.name
    db\.commit\(\)
    return c\.to_dict\(\)

@router\.delete\("/colors/\{id\}"\)
def delete_color\(id: int, claims: dict = Depends\(require_business_admin\), db: Session = Depends\(get_db\)\):
    c = db\.query\(Color\)\.filter\(Color\.id == id, Color\.business_id == claims\["business_id"\]\)\.first\(\)
    if not c: raise HTTPException\(status_code=404\)
    db\.delete\(c\)
    db\.commit\(\)
    return \{"message": "Deleted"\}'''

replacement_colors = '''@router.post("/colors")
def create_color(payload: ColorCreate, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    c = Color(name=payload.name)
    if hasattr(payload, 'hex_code') and payload.hex_code:
        c.hex_code = payload.hex_code
    db.add(c)
    db.commit()
    db.refresh(c)
    return c.to_dict()

@router.put("/colors/{id}")
def update_color(id: int, payload: ColorCreate, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    c = db.query(Color).filter(Color.id == id).first()
    if not c: raise HTTPException(status_code=404)
    c.name = payload.name
    if hasattr(payload, 'hex_code') and payload.hex_code:
        c.hex_code = payload.hex_code
    db.commit()
    return c.to_dict()

@router.delete("/colors/{id}")
def delete_color(id: int, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    c = db.query(Color).filter(Color.id == id).first()
    if not c: raise HTTPException(status_code=404)
    db.delete(c)
    db.commit()
    return {"message": "Deleted"}'''

content = re.sub(pattern_colors, replacement_colors, content)

pattern_prints = r'''@router\.post\("/prints"\)
def create_print\(payload: PrintCreate, claims: dict = Depends\(require_business_admin\), db: Session = Depends\(get_db\)\):
    p = Print\(name=payload\.name, business_id=claims\["business_id"\]\)
    db\.add\(p\)
    db\.commit\(\)
    db\.refresh\(p\)
    return p\.to_dict\(\)

@router\.put\("/prints/\{id\}"\)
def update_print\(id: int, payload: PrintCreate, claims: dict = Depends\(require_business_admin\), db: Session = Depends\(get_db\)\):
    p = db\.query\(Print\)\.filter\(Print\.id == id, Print\.business_id == claims\["business_id"\]\)\.first\(\)
    if not p: raise HTTPException\(status_code=404\)
    p\.name = payload\.name
    db\.commit\(\)
    return p\.to_dict\(\)

@router\.delete\("/prints/\{id\}"\)
def delete_print\(id: int, claims: dict = Depends\(require_business_admin\), db: Session = Depends\(get_db\)\):
    p = db\.query\(Print\)\.filter\(Print\.id == id, Print\.business_id == claims\["business_id"\]\)\.first\(\)
    if not p: raise HTTPException\(status_code=404\)
    db\.delete\(p\)
    db\.commit\(\)
    return \{"message": "Deleted"\}'''

replacement_prints = '''@router.post("/prints")
def create_print(payload: PrintCreate, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    p = Print(name=payload.name)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p.to_dict()

@router.put("/prints/{id}")
def update_print(id: int, payload: PrintCreate, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    p = db.query(Print).filter(Print.id == id).first()
    if not p: raise HTTPException(status_code=404)
    p.name = payload.name
    db.commit()
    return p.to_dict()

@router.delete("/prints/{id}")
def delete_print(id: int, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    p = db.query(Print).filter(Print.id == id).first()
    if not p: raise HTTPException(status_code=404)
    db.delete(p)
    db.commit()
    return {"message": "Deleted"}'''

content = re.sub(pattern_prints, replacement_prints, content)

pattern_defects = r'''@router\.post\("/defects"\)
def create_defect\(payload: DefectCreate, claims: dict = Depends\(require_business_admin\), db: Session = Depends\(get_db\)\):
    d = Defect\(name=payload\.name, business_id=claims\["business_id"\]\)
    db\.add\(d\)
    db\.commit\(\)
    db\.refresh\(d\)
    return d\.to_dict\(\)

@router\.put\("/defects/\{id\}"\)
def update_defect\(id: int, payload: DefectCreate, claims: dict = Depends\(require_business_admin\), db: Session = Depends\(get_db\)\):
    d = db\.query\(Defect\)\.filter\(Defect\.id == id, Defect\.business_id == claims\["business_id"\]\)\.first\(\)
    if not d: raise HTTPException\(status_code=404\)
    d\.name = payload\.name
    db\.commit\(\)
    return d\.to_dict\(\)

@router\.delete\("/defects/\{id\}"\)
def delete_defect\(id: int, claims: dict = Depends\(require_business_admin\), db: Session = Depends\(get_db\)\):
    d = db\.query\(Defect\)\.filter\(Defect\.id == id, Defect\.business_id == claims\["business_id"\]\)\.first\(\)
    if not d: raise HTTPException\(status_code=404\)
    db\.delete\(d\)
    db\.commit\(\)
    return \{"message": "Deleted"\}'''

replacement_defects = '''@router.post("/defects")
def create_defect(payload: DefectCreate, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    d = Defect(name=payload.name)
    db.add(d)
    db.commit()
    db.refresh(d)
    return d.to_dict()

@router.put("/defects/{id}")
def update_defect(id: int, payload: DefectCreate, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    d = db.query(Defect).filter(Defect.id == id).first()
    if not d: raise HTTPException(status_code=404)
    d.name = payload.name
    db.commit()
    return d.to_dict()

@router.delete("/defects/{id}")
def delete_defect(id: int, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    d = db.query(Defect).filter(Defect.id == id).first()
    if not d: raise HTTPException(status_code=404)
    db.delete(d)
    db.commit()
    return {"message": "Deleted"}'''

content = re.sub(pattern_defects, replacement_defects, content)

with open('platform/verticals/laundry/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
