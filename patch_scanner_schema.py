import re

# 1. Update schemas.py
with open('platform/verticals/laundry/schemas.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('ticket_number: str', 'ticket_code: str')

with open('platform/verticals/laundry/schemas.py', 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Update routes.py
with open('platform/verticals/laundry/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('OrderGarmentTicket.ticket_code == payload.ticket_number', 'OrderGarmentTicket.ticket_code == payload.ticket_code')

with open('platform/verticals/laundry/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
