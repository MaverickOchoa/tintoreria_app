import re

# 1. Update models.py
with open('platform/verticals/laundry/models.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''class OrderItem\(Base\):
    __tablename__ = "order_items"

    id = Column\(Integer, primary_key=True\)
    order_id = Column\(Integer, ForeignKey\("orders.id"\), nullable=False\)
    item_id = Column\(Integer, ForeignKey\("items.id"\), nullable=False\)
    quantity = Column\(Integer, nullable=False, default=1\)
    unit_price = Column\(Numeric\(10, 2\), nullable=False\)
    subtotal = Column\(Numeric\(10, 2\), nullable=False\)
    notes = Column\(Text, nullable=True\)
    color = Column\(String\(50\), nullable=True\)
    brand = Column\(String\(80\), nullable=True\)
    defects = Column\(Text, nullable=True\)'''

replacement = '''class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_service_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Numeric(10, 2), nullable=False)
    line_total = Column(Numeric(10, 2), nullable=False)
    notes = Column(Text, nullable=True)
    color = Column(String(50), nullable=True)
    brand = Column(String(80), nullable=True)
    defects = Column(Text, nullable=True)'''

content = re.sub(pattern, replacement, content)

# Also fix to_dict in OrderItem
to_dict_pattern = r'''    def to_dict\(self\) -> dict:
        return \{
            "id": self.id, "order_id": self.order_id, "item_id": self.item_id,
            "item_name": self.product_service.name if self.product_service else None,
            "quantity": self.quantity,
            "unit_price": str\(self.unit_price\), "subtotal": str\(self.subtotal\),
            "notes": self.notes, "color": self.color,
            "brand": self.brand, "defects": self.defects,
        \}'''

to_dict_replacement = '''    def to_dict(self) -> dict:
        return {
            "id": self.id, "order_id": self.order_id, "product_service_id": self.product_service_id,
            "item_name": self.product_service.name if self.product_service else None,
            "quantity": self.quantity,
            "unit_price": str(self.unit_price), "line_total": str(self.line_total),
            "notes": self.notes, "color": self.color,
            "brand": self.brand, "defects": self.defects,
        }'''

content = re.sub(to_dict_pattern, to_dict_replacement, content)

with open('platform/verticals/laundry/models.py', 'w', encoding='utf-8') as f:
    f.write(content)


# 2. Update services.py
with open('platform/verticals/laundry/services.py', 'r', encoding='utf-8') as f:
    content = f.read()

services_pattern = r'''        db.add\(OrderItem\(
            order_id=new_order.id, item_id=item_id,
            quantity=int\(i\["quantity"\]\), unit_price=float\(i\["unit_price"\]\),
            subtotal=line_total, notes=i.get\("notes"\),
            color=i.get\("color"\), brand=i.get\("brand"\), defects=i.get\("defects"\),
        \)\)'''

services_replacement = '''        db.add(OrderItem(
            order_id=new_order.id, product_service_id=item_id,
            quantity=int(i["quantity"]), unit_price=float(i["unit_price"]),
            line_total=line_total, notes=i.get("notes"),
            color=i.get("color"), brand=i.get("brand"), defects=i.get("defects"),
        ))'''

content = re.sub(services_pattern, services_replacement, content)

with open('platform/verticals/laundry/services.py', 'w', encoding='utf-8') as f:
    f.write(content)


# 3. Update main.py migrations
with open('platform/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

migration = '''    "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS notes TEXT;",
    "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS color VARCHAR(50);",
    "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS brand VARCHAR(80);",
    "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS defects TEXT;",'''

if "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS notes" not in content:
    content = content.replace(
        '    # Clinic Expenses',
        migration + '\n    # Clinic Expenses'
    )

with open('platform/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
