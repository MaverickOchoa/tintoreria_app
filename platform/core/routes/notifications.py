from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from core.database import get_db
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
