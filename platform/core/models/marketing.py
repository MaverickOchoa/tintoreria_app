from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Date, Text
from core.database import Base

class WhatsappTemplate(Base):
    __tablename__ = "whatsapp_templates"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    template_text = Column(Text, nullable=False)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=True)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "template_text": self.template_text, "business_id": self.business_id}

class EmailTemplate(Base):
    __tablename__ = "email_templates"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    subject = Column(String(200), nullable=False)
    body_html = Column(Text, nullable=False)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=True)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "subject": self.subject, "body_html": self.body_html, "business_id": self.business_id}

class TriggerChannelConfig(Base):
    __tablename__ = "trigger_channel_config"
    id = Column(Integer, primary_key=True)
    trigger_type = Column(String(50), nullable=False) # e.g. 'new_client', 'birthday'
    channel = Column(String(50), nullable=False) # 'whatsapp', 'email'
    template_id = Column(Integer, nullable=False) 
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=True)

    def to_dict(self):
        return {"id": self.id, "trigger_type": self.trigger_type, "channel": self.channel, "template_id": self.template_id, "business_id": self.business_id}

class DateCampaign(Base):
    __tablename__ = "date_campaigns"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    send_date = Column(Date, nullable=False)
    client_type_id = Column(Integer, nullable=True)
    channel = Column(String(50), nullable=False)
    template_id = Column(Integer, nullable=False)
    is_sent = Column(Boolean, default=False)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=True)

    def to_dict(self):
        return {
            "id": self.id, "name": self.name, "send_date": self.send_date.isoformat(),
            "client_type_id": self.client_type_id, "channel": self.channel,
            "template_id": self.template_id, "is_sent": self.is_sent, "business_id": self.business_id
        }
