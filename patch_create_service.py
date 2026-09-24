import re

with open('platform/verticals/laundry/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''@router\.post\("/services", status_code=201\)
def create_service\(
    payload: ServiceCreate,
    claims: dict = Depends\(require_business_admin\),
    db: Session = Depends\(get_db\),
\):'''

replacement = '''from core.dependencies import require_super_admin

@router.post("/services", status_code=201)
def create_service(
    payload: ServiceCreate,
    claims: dict = Depends(require_super_admin),
    db: Session = Depends(get_db),
):'''

content = re.sub(pattern, replacement, content)

with open('platform/verticals/laundry/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
