from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from werkzeug.security import generate_password_hash
from typing import Optional, List
from core.database import get_db
from core.dependencies import require_business_admin, get_current_claims
from core.models.client import Client, ClientType, ClientDiscount
from core.models.tenant import Branch
from core.schemas.client import (
    ClientCreate, ClientUpdate, ClientOut,
    ClientTypeCreate, ClientTypeOut,
    ClientDiscountCreate, ClientDiscountOut,
)

router = APIRouter(tags=["clients"])


@router.get("/clients")
def list_clients(
    search: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    business_id = claims.get("business_id")
    query = db.query(Client)
    if not claims.get("is_super_admin"):
        branch_ids = [b.id for b in db.query(Branch).filter_by(business_id=business_id).all()] if business_id else []
        query = query.filter(Client.branch_id.in_(branch_ids))
    if search:
        query = query.filter(
            Client.phone.contains(search) |
            Client.full_name.ilike(f"%{search}%")
        )
    total = query.count()
    clients = query.offset(offset).limit(limit).all()
    return {"total": total, "clients": [c.to_dict() for c in clients]}


@router.post("/clients", status_code=201)
def create_client(
    payload: ClientCreate,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    if db.query(Client).filter(Client.phone == payload.phone).first():
        raise HTTPException(status_code=409, detail="Ya existe un cliente con ese teléfono.")
    dump = payload.model_dump()
    fn1 = dump.pop("first_name", None)
    fn2 = dump.pop("full_name", None)
    full_name = fn1 or fn2 or ""
    
    sn1 = dump.pop("street_number", None)
    sn2 = dump.pop("street_and_number", None)
    street_and_number = sn1 or sn2
    
    for k in ["username", "whatsapp_consent", "email_consent"]:
        dump.pop(k, None)

    # Auto-generate username and password for portal access
    base_user = full_name.split()[0].lower() if full_name else "user"
    base_user = base_user.replace(' ', '')
    username = base_user
    counter = 1
    while db.query(Client).filter(Client.username == username).first():
        username = f"{base_user}{counter}"
        counter += 1
    
    password_hash = generate_password_hash(payload.phone) if payload.phone else generate_password_hash("1234567890")

    client = Client(**dump, full_name=full_name, street_and_number=street_and_number, username=username, password=password_hash)
    try:
        db.add(client)
        db.commit()
        db.refresh(client)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
        
    branch = db.query(Branch).filter(Branch.id == client.branch_id).first()
    if branch:
        dispatch_event(db, "client_welcome", branch.business_id, client, {"plain_password": payload.phone if payload.phone else "1234567890"})
        
    return client.to_dict()


@router.get("/clients/{client_id}")
def get_client(
    client_id: int,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado.")
    return client.to_dict()


@router.put("/clients/{client_id}")
def update_client(
    client_id: int,
    payload: ClientUpdate,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado.")
    dump = payload.model_dump(exclude_none=True)
    if "first_name" in dump:
        dump["full_name"] = dump.pop("first_name")
    if "street_number" in dump:
        dump["street_and_number"] = dump.pop("street_number")
        
    for k in ["username", "whatsapp_consent", "email_consent"]:
        dump.pop(k, None)

    for field, value in dump.items():
        setattr(client, field, value)
    db.commit()
    return client.to_dict()


@router.get("/client-types")
def list_client_types(
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    business_id = claims.get("business_id")
    types = db.query(ClientType).filter(ClientType.business_id == business_id).all()
    return [t.to_dict() for t in types]


@router.post("/client-types", status_code=201)
def create_client_type(
    payload: ClientTypeCreate,
    claims: dict = Depends(require_business_admin),
    db: Session = Depends(get_db),
):
    business_id = claims["business_id"]
    ct = ClientType(name=payload.name, business_id=business_id)
    db.add(ct)
    db.commit()
    db.refresh(ct)
    return ct.to_dict()


@router.post("/clients/{client_id}/discounts", status_code=201)
def add_discount(
    client_id: int,
    payload: ClientDiscountCreate,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado.")
    discount = ClientDiscount(
        client_id=client_id,
        discount_pct=payload.discount_pct,
        reason=payload.reason,
    )
    db.add(discount)
    db.commit()
    db.refresh(discount)
    return discount.to_dict()
