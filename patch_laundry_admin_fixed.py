import re

with open('platform/verticals/laundry/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''@router\.put\("/services/\{service_id\}"\)
def update_service\(service_id: int, payload: ServiceCreate, claims: dict = Depends\(require_business_admin\), db: Session = Depends\(get_db\)\):'''
replacement = '''@router.put("/services/{service_id}")
def update_service(service_id: int, payload: ServiceCreate, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):'''
content = re.sub(pattern, replacement, content)

pattern2 = r'''@router\.delete\("/services/\{service_id\}"\)
def delete_service\(service_id: int, claims: dict = Depends\(require_business_admin\), db: Session = Depends\(get_db\)\):'''
replacement2 = '''@router.delete("/services/{service_id}")
def delete_service(service_id: int, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):'''
content = re.sub(pattern2, replacement2, content)

with open('platform/verticals/laundry/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
