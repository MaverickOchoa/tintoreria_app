import re

with open('platform/verticals/laundry/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''@router\.post\("/services", status_code=201\)
def create_service\(
    payload: ServiceCreate,
    claims: dict = Depends\(get_current_claims\),
    db: Session = Depends\(get_db\),
\):
    service = Service\(name=payload\.name\)
    db\.add\(service\)
    db\.commit\(\)
    db\.refresh\(service\)
    return service\.to_dict\(\)'''

replacement = '''@router.post("/services", status_code=201)
def create_service(
    payload: ServiceCreate,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    # Check if exists
    existing = db.query(Service).filter(func.lower(Service.name) == payload.name.lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="El servicio ya existe.")
        
    service = Service(name=payload.name)
    try:
        db.add(service)
        db.commit()
        db.refresh(service)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return service.to_dict()'''

content = re.sub(pattern, replacement, content)

with open('platform/verticals/laundry/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
