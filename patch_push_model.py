import re

with open('platform/core/models/client.py', 'r', encoding='utf-8') as f:
    content = f.read()

model_str = '''
class ClientPushSubscription(Base):
    __tablename__ = "client_push_subscriptions"

    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    endpoint = Column(String(1024), nullable=False)
    p256dh = Column(String(255), nullable=False)
    auth = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", backref="push_subscriptions")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "client_id": self.client_id,
            "endpoint": self.endpoint,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
'''

if 'class ClientPushSubscription' not in content:
    content = content + model_str

with open('platform/core/models/client.py', 'w', encoding='utf-8') as f:
    f.write(content)
