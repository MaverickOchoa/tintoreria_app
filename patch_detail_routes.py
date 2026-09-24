import re

with open('platform/verticals/laundry/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern_colors = r'''@router\.get\("/colors"\)
def list_colors\(claims: dict = Depends\(get_current_claims\), db: Session = Depends\(get_db\)\):
    biz_id = claims\.get\("business_id"\)
    if not biz_id: return \{"colors": \[\]\}
    colors = db\.query\(Color\)\.filter\(Color\.business_id == biz_id\)\.all\(\)
    return \{"colors": \[c\.to_dict\(\) for c in colors\]\}'''

replacement_colors = '''@router.get("/colors")
def list_colors(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    colors = db.query(Color).all()
    return {"colors": [c.to_dict() for c in colors]}'''

content = re.sub(pattern_colors, replacement_colors, content)

pattern_prints = r'''@router\.get\("/prints"\)
def list_prints\(claims: dict = Depends\(get_current_claims\), db: Session = Depends\(get_db\)\):
    biz_id = claims\.get\("business_id"\)
    if not biz_id: return \{"prints": \[\]\}
    prints = db\.query\(Print\)\.filter\(Print\.business_id == biz_id\)\.all\(\)
    return \{"prints": \[p\.to_dict\(\) for p in prints\]\}'''

replacement_prints = '''@router.get("/prints")
def list_prints(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    prints = db.query(Print).all()
    return {"prints": [p.to_dict() for p in prints]}'''

content = re.sub(pattern_prints, replacement_prints, content)

pattern_defects = r'''@router\.get\("/defects"\)
def list_defects\(claims: dict = Depends\(get_current_claims\), db: Session = Depends\(get_db\)\):
    biz_id = claims\.get\("business_id"\)
    if not biz_id: return \{"defects": \[\]\}
    defects = db\.query\(Defect\)\.filter\(Defect\.business_id == biz_id\)\.all\(\)
    return \{"defects": \[d\.to_dict\(\) for d in defects\]\}'''

replacement_defects = '''@router.get("/defects")
def list_defects(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    defects = db.query(Defect).all()
    return {"defects": [d.to_dict() for d in defects]}'''

content = re.sub(pattern_defects, replacement_defects, content)

with open('platform/verticals/laundry/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
