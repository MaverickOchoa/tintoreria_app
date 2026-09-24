import re

with open('platform/verticals/laundry/models.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''    def to_dict\(self\) -> dict:
        return \{
            "id": self.id, "order_id": self.order_id,
            "ticket_number": self.ticket_number,
            "item_name": self.item_name, "color": self.color,
            "brand": self.brand, "defects": self.defects, "notes": self.notes,
            "scanned_at": self.scanned_at.isoformat\(\) if self.scanned_at else None,
        \}'''

replacement = '''    def to_dict(self) -> dict:
        return {
            "id": self.id, "order_id": self.order_id,
            "ticket_code": self.ticket_code,
            "item_name": self.item_name,
            "quantity_index": self.quantity_index,
            "scanned": self.scanned,
            "scanned_at": self.scanned_at.isoformat() if self.scanned_at else None,
        }'''

content = re.sub(pattern, replacement, content)

with open('platform/verticals/laundry/models.py', 'w', encoding='utf-8') as f:
    f.write(content)
