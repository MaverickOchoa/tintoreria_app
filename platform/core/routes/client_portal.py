from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from werkzeug.security import check_password_hash
from pydantic import BaseModel

from core.database import get_db
from core.models.client import Client, ClientDiscount
from core.models.tenant import Branch
from verticals.laundry.models import Order
from core.models.promotion import Promotion
from core.security import create_access_token
from core.dependencies import get_current_claims

router = APIRouter(tags=["client-portal"])

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/client-auth/login")
def client_login(payload: LoginRequest, db: Session = Depends(get_db)):
    username = payload.username.strip()
    password = payload.password.strip()
    if not username or not password:
        raise HTTPException(status_code=400, detail="Usuario y contraseña requeridos")
        
    client = db.query(Client).filter(Client.username == username).first()
    if not client or not client.password:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
        
    if not check_password_hash(client.password, password):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")
        
    business_id = None
    if client.branch_id:
        branch = db.query(Branch).filter(Branch.id == client.branch_id).first()
        business_id = branch.business_id if branch else None
        
    additional = {
        "role": "client",
        "client_id": client.id,
        "business_id": business_id,
        "branch_id": client.branch_id,
        "is_super_admin": False,
    }
    
    token = create_access_token(subject=str(client.id), extra_claims=additional)
    return {
        "access_token": token,
        "role": "client",
        "client_id": client.id,
        "business_id": business_id,
        "full_name": client.full_name
    }

@router.get("/client-portal/me")
def get_client_me(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    if claims.get("role") != "client":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    client_id = claims.get("client_id")
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return client.to_dict()

@router.get("/client-portal/orders")
def get_client_orders(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    if claims.get("role") != "client":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    client_id = claims.get("client_id")
    orders = db.query(Order).filter(Order.client_id == client_id).order_by(Order.id.desc()).all()
    return {"orders": [o.to_dict() for o in orders]}

@router.get("/client-portal/discounts")
def get_client_discounts(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    if claims.get("role") != "client":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    client_id = claims.get("client_id")
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
        
    discounts = db.query(ClientDiscount).filter(ClientDiscount.client_id == client_id).order_by(ClientDiscount.created_at.desc()).all()
    
    promos = []
    if client.client_type_id and client.branch_id:
        branch = db.query(Branch).filter(Branch.id == client.branch_id).first()
        if branch:
            promos_db = db.query(Promotion).filter(
                Promotion.business_id == branch.business_id,
                Promotion.active == True,
                Promotion.client_type_id == client.client_type_id
            ).all()
            promos = [p.to_dict() for p in promos_db]
            
    return {
        "discounts": [d.to_dict() for d in discounts],
        "promotions": promos
    }
