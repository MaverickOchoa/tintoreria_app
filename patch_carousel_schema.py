import re

# 1. Update schemas.py
with open('platform/verticals/laundry/schemas.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('    position: str', '    carousel_position: str')

with open('platform/verticals/laundry/schemas.py', 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Update routes.py
with open('platform/verticals/laundry/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('order.carousel_position = payload.position', 'order.carousel_position = payload.carousel_position')

with open('platform/verticals/laundry/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
