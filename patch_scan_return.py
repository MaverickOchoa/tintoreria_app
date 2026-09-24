import re

with open('platform/verticals/laundry/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''    ticket\.scanned_at = datetime\.utcnow\(\)
    db\.commit\(\)
    total = len\(order\.garment_tickets\)
    scanned = len\(\[t for t in order\.garment_tickets if t\.scanned_at\]\)
    return \{"scanned": scanned, "total": total, "all_scanned": scanned == total\}'''

replacement = '''    ticket.scanned_at = datetime.utcnow()
    ticket.scanned = True
    db.commit()
    db.refresh(order)
    return {"message": "Ticket escaneado", "tickets": [t.to_dict() for t in order.garment_tickets]}'''

content = re.sub(pattern, replacement, content)

with open('platform/verticals/laundry/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
