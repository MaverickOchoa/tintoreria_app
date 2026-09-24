import re

with open('platform/core/models/payment.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('self.paid_at', 'self.created_at')

with open('platform/core/models/payment.py', 'w', encoding='utf-8') as f:
    f.write(content)
