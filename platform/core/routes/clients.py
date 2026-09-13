from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
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
    client = Client(**payload.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
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
    for field, value in payload.model_dump(exclude_none=True).items():
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
