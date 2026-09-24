import re

with open('platform/core/routes/tenants.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('clinic_patients', 'patients')
content = content.replace('clinic_appointments', 'appointments')

with open('platform/core/routes/tenants.py', 'w', encoding='utf-8') as f:
    f.write(content)
