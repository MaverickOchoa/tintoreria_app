import re

with open('platform/verticals/laundry/models.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''class OrderGarmentTicket\(Base\):
    __tablename__ = "order_garment_tickets"

    id = Column\(Integer, primary_key=True\)
    order_id = Column\(Integer, ForeignKey\("orders.id"\), nullable=False\)
    ticket_number = Column\(String\(30\), nullable=False\)
    item_name = Column\(String\(120\), nullable=True\)
    color = Column\(String\(50\), nullable=True\)
    brand = Column\(String\(80\), nullable=True\)
    defects = Column\(Text, nullable=True\)
    notes = Column\(Text, nullable=True\)
    scanned_at = Column\(DateTime, nullable=True\)'''

replacement = '''class OrderGarmentTicket(Base):
    __tablename__ = "order_garment_tickets"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    ticket_code = Column(String(40), unique=True, nullable=False)
    item_name = Column(String(100), nullable=False)
    quantity_index = Column(Integer, nullable=False)
    scanned = Column(Boolean, nullable=False, default=False)
    scanned_at = Column(DateTime, nullable=True)'''

content = re.sub(pattern, replacement, content)

with open('platform/verticals/laundry/models.py', 'w', encoding='utf-8') as f:
    f.write(content)
