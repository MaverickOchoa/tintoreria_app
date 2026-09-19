from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from core.database import get_db
from core.dependencies import require_business_admin, get_current_claims
from core.models.promotion import Promotion
from core.models.marketing import WhatsappTemplate, EmailTemplate, TriggerChannelConfig, DateCampaign

router = APIRouter(tags=["promotions", "marketing"])

# ---------- PROMOTIONS ----------
@router.get("/promotions")
def list_promotions(active_only: int = 0, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    biz_id = claims.get("business_id")
    q = db.query(Promotion).filter(Promotion.business_id == biz_id)
    if active_only:
        q = q.filter(Promotion.active == True)
    return {"promotions": [p.to_dict() for p in q.all()]}

@router.post("/promotions")
def create_promotion(payload: dict, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    p = Promotion(
        name=payload.get("name", "Promo"),
        active=payload.get("active", True),
        business_id=claims["business_id"]
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p.to_dict()

@router.put("/promotions/{id}")
def update_promotion(id: int, payload: dict, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    p = db.query(Promotion).filter(Promotion.id == id, Promotion.business_id == claims["business_id"]).first()
    if not p: raise HTTPException(404)
    if "active" in payload:
        p.active = payload["active"]
    db.commit()
    return p.to_dict()

@router.delete("/promotions/{id}")
def delete_promotion(id: int, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    p = db.query(Promotion).filter(Promotion.id == id, Promotion.business_id == claims["business_id"]).first()
    if not p: raise HTTPException(404)
    db.delete(p)
    db.commit()
    return {"message": "deleted"}

# ---------- WHATSAPP TEMPLATES ----------
@router.get("/whatsapp-templates")
def list_whatsapp_templates(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    biz = claims.get("business_id")
    q = db.query(WhatsappTemplate).filter(WhatsappTemplate.business_id == biz).all()
    return {"templates": [t.to_dict() for t in q]}

@router.post("/whatsapp-templates")
def create_whatsapp_template(payload: dict, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    t = WhatsappTemplate(name=payload["name"], template_text=payload["template_text"], business_id=claims["business_id"])
    db.add(t)
    db.commit()
    return t.to_dict()

@router.put("/whatsapp-templates/{id}")
def update_whatsapp_template(id: int, payload: dict, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    t = db.query(WhatsappTemplate).filter(WhatsappTemplate.id == id, WhatsappTemplate.business_id == claims["business_id"]).first()
    if not t: raise HTTPException(404)
    t.name = payload["name"]
    t.template_text = payload["template_text"]
    db.commit()
    return t.to_dict()

@router.delete("/whatsapp-templates/{id}")
def delete_whatsapp_template(id: int, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    t = db.query(WhatsappTemplate).filter(WhatsappTemplate.id == id, WhatsappTemplate.business_id == claims["business_id"]).first()
    if not t: raise HTTPException(404)
    db.delete(t)
    db.commit()
    return {"message": "deleted"}

# ---------- EMAIL TEMPLATES ----------
@router.get("/email-templates")
def list_email_templates(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    biz = claims.get("business_id")
    q = db.query(EmailTemplate).filter(EmailTemplate.business_id == biz).all()
    return {"templates": [t.to_dict() for t in q]}

@router.post("/email-templates")
def create_email_template(payload: dict, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    t = EmailTemplate(name=payload["name"], subject=payload["subject"], body_html=payload["body_html"], business_id=claims["business_id"])
    db.add(t)
    db.commit()
    return t.to_dict()

@router.put("/email-templates/{id}")
def update_email_template(id: int, payload: dict, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    t = db.query(EmailTemplate).filter(EmailTemplate.id == id, EmailTemplate.business_id == claims["business_id"]).first()
    if not t: raise HTTPException(404)
    t.name = payload["name"]
    t.subject = payload["subject"]
    t.body_html = payload["body_html"]
    db.commit()
    return t.to_dict()

@router.delete("/email-templates/{id}")
def delete_email_template(id: int, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    t = db.query(EmailTemplate).filter(EmailTemplate.id == id, EmailTemplate.business_id == claims["business_id"]).first()
    if not t: raise HTTPException(404)
    db.delete(t)
    db.commit()
    return {"message": "deleted"}

# ---------- TRIGGER CONFIG ----------
@router.get("/trigger-channel-config")
def list_triggers(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    biz = claims.get("business_id")
    q = db.query(TriggerChannelConfig).filter(TriggerChannelConfig.business_id == biz).all()
    return {"configs": [t.to_dict() for t in q]}

@router.post("/trigger-channel-config")
def set_trigger(payload: dict, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    # Overwrite if exists
    c = db.query(TriggerChannelConfig).filter_by(trigger_type=payload["trigger_type"], business_id=claims["business_id"]).first()
    if c:
        c.channel = payload["channel"]
        c.template_id = payload["template_id"]
    else:
        c = TriggerChannelConfig(trigger_type=payload["trigger_type"], channel=payload["channel"], template_id=payload["template_id"], business_id=claims["business_id"])
        db.add(c)
    db.commit()
    return c.to_dict()

# ---------- DATE CAMPAIGNS ----------
@router.get("/date-campaigns")
def list_date_campaigns(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    biz = claims.get("business_id")
    q = db.query(DateCampaign).filter(DateCampaign.business_id == biz).all()
    return {"campaigns": [t.to_dict() for t in q]}

@router.post("/date-campaigns")
def create_date_campaign(payload: dict, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    from datetime import datetime
    t = DateCampaign(
        name=payload["name"], 
        send_date=datetime.strptime(payload["send_date"], "%Y-%m-%d").date(), 
        client_type_id=payload.get("client_type_id"),
        channel=payload["channel"],
        template_id=payload["template_id"],
        business_id=claims["business_id"]
    )
    db.add(t)
    db.commit()
    return t.to_dict()

@router.delete("/date-campaigns/{id}")
def delete_date_campaign(id: int, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    t = db.query(DateCampaign).filter(DateCampaign.id == id, DateCampaign.business_id == claims["business_id"]).first()
    if not t: raise HTTPException(404)
    db.delete(t)
    db.commit()
    return {"message": "deleted"}
