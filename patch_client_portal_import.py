import re

with open('platform/core/routes/client_portal.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('from core.models.order import Order', 'from verticals.laundry.models import Order')

with open('platform/core/routes/client_portal.py', 'w', encoding='utf-8') as f:
    f.write(content)
