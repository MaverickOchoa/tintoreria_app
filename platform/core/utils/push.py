import logging
import json
from pywebpush import webpush, WebPushException
from sqlalchemy.orm import Session
from core.models.client import Client, ClientPushSubscription
from core.models.tenant import Business
from core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

def send_push_notification(db: Session, client_id: int, title: str, body: str, url: str = None) -> bool:
    """
    Sends a web push notification to all subscriptions of a client.
    Returns True if at least one notification was sent successfully.
    """
    subs = db.query(ClientPushSubscription).filter(ClientPushSubscription.client_id == client_id).all()
    if not subs:
        return False
        
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        return False
        
    message = {
        "title": title,
        "body": body,
        "url": url or "/#/client-portal"
    }
    
    success = False
    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {
                        "p256dh": sub.p256dh,
                        "auth": sub.auth
                    }
                },
                data=json.dumps(message),
                vapid_private_key=settings.vapid_private_key,
                vapid_claims={"sub": settings.vapid_claims_email}
            )
            success = True
        except WebPushException as ex:
            logger.error(f"WebPush Error for endpoint {sub.endpoint}: {repr(ex)}")
            # If the subscription is expired or invalid, remove it
            if ex.response and ex.response.status_code in [404, 410]:
                db.delete(sub)
                db.commit()
        except Exception as e:
            logger.error(f"Push notification error: {e}")
            
    return success

def dispatch_event(db: Session, event_type: str, business_id: int, client: Client, extra: dict = None):
    """
    Dispatches notifications via Web Push. If no push subscription exists, logs a fallback (as the old WhatsApp/Email logic would).
    """
    extra = extra or {}
    business = db.query(Business).filter(Business.id == business_id).first()
    business_name = business.name if business else "La Tintorería"
    
    title = ""
    body = ""
    
    if event_type == "order_ready":
        title = "¡Tu pedido está listo!"
        folio = extra.get('folio', '')
        body = f"Hola {client.full_name}, tu nota #{folio} ya está lista para recoger en {business_name}."
    elif event_type == "client_welcome":
        title = f"¡Bienvenido a {business_name}!"
        body = f"Hola {client.full_name}, hemos creado tu cuenta. Tu contraseña temporal es: {extra.get('plain_password')}"
    elif event_type == "client_recurring":
        title = "¡Gracias por tu preferencia!"
        body = f"Hola {client.full_name}, ya eres cliente frecuente en {business_name}."
    else:
        return
        
    # Attempt Push Notification
    pushed = send_push_notification(db, client.id, title, body)
    
    if not pushed:
        logger.info(f"No push subscriptions for Client {client.id}. Falling back to WhatsApp/Email logic (which is handled by Flask legacy for now).")
        # In the future, you could invoke the Resend API or Twilio API directly here.