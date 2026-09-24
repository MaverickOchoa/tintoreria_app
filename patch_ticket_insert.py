import re

with open('platform/verticals/laundry/services.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''        for _ in range\(total_tickets\):
            code = f"\{new_order.folio\}-\{ticket_seq\}"
            db.add\(OrderGarmentTicket\(
                order_id=new_order.id, ticket_number=code, item_name=item_name,
            \)\)
            ticket_seq \+= 1'''

replacement = '''        for _ in range(total_tickets):
            code = f"{new_order.folio}-{ticket_seq}"
            db.add(OrderGarmentTicket(
                order_id=new_order.id, ticket_code=code, item_name=item_name,
                quantity_index=ticket_seq, scanned=False
            ))
            ticket_seq += 1'''

content = re.sub(pattern, replacement, content)

with open('platform/verticals/laundry/services.py', 'w', encoding='utf-8') as f:
    f.write(content)
