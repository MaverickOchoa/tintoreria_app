import re

with open('platform/verticals/laundry/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('OrderGarmentTicket.ticket_number == payload.ticket_number', 'OrderGarmentTicket.ticket_code == payload.ticket_number')

with open('platform/verticals/laundry/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
