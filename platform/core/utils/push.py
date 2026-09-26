import logging
import json
from pywebpush import webpush, WebPushException
from sqlalchemy.orm import Session
from core.models.client import Client, ClientPushSubscription, ClientMessage
from core.models.tenant import Business
from core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

def send_push_notification(subscription_info: dict, payload: dict):
    """
    Original push notification function used by clinic routes.
    """
    try:
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload),
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={
                'sub': settings.vapid_claims_email
            }
        )
        return True
    except WebPushException as ex:
        print('Push failed: ', ex)
        if hasattr(ex, 'response') and ex.response and ex.response.status_code == 410:
            return 'expired'
        return False


def dispatch_event(db: Session, event_type: str, business_id: int, client: Client, extra: dict = None):
    """
    Dispatches notifications via Web Push. If no push subscription exists, logs a fallback.
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
        
    # Guardar en bandeja de entrada del cliente
    new_msg = ClientMessage(client_id=client.id, title=title, body=body)
    db.add(new_msg)
    db.commit()
        
    subs = db.query(ClientPushSubscription).filter(ClientPushSubscription.client_id == client.id).all()
    
    # Also trigger legacy Whatsapp/Email logic
    try:
        import sys
        if "backend.app" in sys.modules:
            dispatch_trigger = sys.modules["backend.app"].dispatch_trigger
            # Create a mock object that matches what legacy dispatch_trigger expects
            class LegacyClientMock:
                def __init__(self, c):
                    self.id = c.id
                    self.full_name = c.full_name
                    self.last_name = c.last_name
                    self.email = c.email
                    self.phone = c.phone
                    self.whatsapp_consent = getattr(c, "whatsapp_consent", True)
                    self.email_consent = getattr(c, "email_consent", True)
                    self.username = getattr(c, "username", "")
            
            with sys.modules["backend.app"].app.app_context():
                dispatch_trigger(event_type, business_id, LegacyClientMock(client), extra)
    except Exception as e:
        logger.error(f"Failed to call legacy dispatch_trigger: {e}")

    if not subs:
        logger.info(f"No push subscriptions for Client {client.id}.")
        return
        
    pushed = False
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
        elif res:
            pushed = True
            
    return pushed