import json
from pywebpush import webpush, WebPushException
from core.config import get_settings

settings = get_settings()

def send_push_notification(subscription_info: dict, payload: dict):
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