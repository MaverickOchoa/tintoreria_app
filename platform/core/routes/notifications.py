from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from fastapi import BackgroundTasks
from typing import Optional
from core.database import get_db, SessionLocal
from core.models.client import Client, ClientMessage
from core.models.tenant import Branch
from core.dependencies import require_business_admin
from core.utils.push import send_push_notification
from core.models.client import ClientPushSubscription
from core.dependencies import get_current_claims
from core.config import get_settings

router = APIRouter(tags=["notifications"])
settings = get_settings()


class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str

class PushSubscriptionCreate(BaseModel):
    endpoint: str
    keys: PushSubscriptionKeys


@router.get("/client-portal/notifications/public-key")
def get_public_key():
    return {"public_key": settings.vapid_public_key}


@router.post("/client-portal/notifications/subscribe", status_code=201)
def subscribe_to_push(
    payload: PushSubscriptionCreate,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db)
):
    if claims.get("role") != "client":
        raise HTTPException(status_code=403, detail="Acceso denegado")
        
    client_id = claims.get("client_id")
    
    # Check if already subscribed
    existing = db.query(ClientPushSubscription).filter(
        ClientPushSubscription.client_id == client_id,
        ClientPushSubscription.endpoint == payload.endpoint
    ).first()
    
    if existing:
        # Update keys just in case
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
        db.commit()
        return {"message": "Suscripción actualizada"}
        
    sub = ClientPushSubscription(
        client_id=client_id,
        endpoint=payload.endpoint,
        p256dh=payload.keys.p256dh,
        auth=payload.keys.auth
    )
    db.add(sub)
    db.commit()
    return {"message": "Suscripción guardada exitosamente"}


@router.delete("/client-portal/notifications/unsubscribe")
def unsubscribe_from_push(
    endpoint: str,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db)
):
    if claims.get("role") != "client":
        raise HTTPException(status_code=403, detail="Acceso denegado")
        
    client_id = claims.get("client_id")
    deleted = db.query(ClientPushSubscription).filter(
        ClientPushSubscription.client_id == client_id,
        ClientPushSubscription.endpoint == endpoint
    ).delete()
    
    db.commit()
    
    if deleted:
        return {"message": "Suscripción eliminada exitosamente"}
    return {"message": "No se encontró la suscripción"}

class PushCampaignCreate(BaseModel):
    title: str
    body: str
    target_type: str
    target_id: Optional[int] = None

def send_mass_push_task(client_ids: list, title: str, body: str):
    db = SessionLocal()
    try:
        # Save messages
        for cid in client_ids:
            msg = ClientMessage(client_id=cid, title=title, body=body)
            db.add(msg)
        db.commit()
        
        # Send webpush
        subs = db.query(ClientPushSubscription).filter(ClientPushSubscription.client_id.in_(client_ids)).all()
        for sub in subs:
            sub_info = {
                "endpoint": sub.endpoint,
                "keys": {
                    "p256dh": sub.p256dh,
                    "auth": sub.auth
                }
            }
            res = send_push_notification(sub_info, { "title": title, "body": body, "url": "/#/client-portal" })
            if res == "expired":
                db.delete(sub)
                db.commit()
    except Exception as e:
        print("Error in push task:", e)
    finally:
        db.close()

@router.post("/businesses/{business_id}/push-campaign")
def send_push_campaign(
    business_id: int,
    payload: PushCampaignCreate,
    background_tasks: BackgroundTasks,
    claims: dict = Depends(require_business_admin),
    db: Session = Depends(get_db)
):
    q = db.query(Client).join(Branch, Branch.id == Client.branch_id).filter(Branch.business_id == business_id)
    
    if payload.target_type == 'branch':
        if not payload.target_id:
            raise HTTPException(400, "ID de sucursal requerido")
        q = q.filter(Client.branch_id == payload.target_id)
    elif payload.target_type == 'client':
        if not payload.target_id:
            raise HTTPException(400, "ID de cliente requerido")
        q = q.filter(Client.id == payload.target_id)
        
    clients = q.all()
    if not clients:
        return {"message": "No hay clientes que cumplan los filtros", "count": 0}
        
    client_ids = [c.id for c in clients]
    background_tasks.add_task(send_mass_push_task, client_ids, payload.title, payload.body)
    
    return {"message": "Aviso enviado exitosamente", "count": len(clients)}
