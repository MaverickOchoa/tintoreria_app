import re

with open('platform/verticals/laundry/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

# I will replace the entire list_services function
pattern = r'''@router\.get\("/services"\)
def list_services\(db: Session = Depends\(get_db\)\):.*?    services = db\.query\(Service\)\.all\(\)
    return \{"services": \[s\.to_dict\(\) for s in services\]\}'''

replacement = '''@router.get("/services")
def list_services(db: Session = Depends(get_db)):
    services = db.query(Service).all()
    return {"services": [s.to_dict() for s in services]}'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('platform/verticals/laundry/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
