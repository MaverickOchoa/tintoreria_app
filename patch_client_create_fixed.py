import re

with open('platform/core/routes/clients.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'client = Client\(\*\*payload\.model_dump\(\)\)\s*db\.add\(client\)'

replacement = '''dump = payload.model_dump()
    full_name = dump.pop("first_name", None) or dump.pop("full_name", None) or ""
    street_and_number = dump.pop("street_number", None) or dump.pop("street_and_number", None)
    
    for k in ["username", "whatsapp_consent", "email_consent"]:
        dump.pop(k, None)

    client = Client(**dump, full_name=full_name, street_and_number=street_and_number)
    db.add(client)'''

content = re.sub(pattern, replacement, content)

with open('platform/core/routes/clients.py', 'w', encoding='utf-8') as f:
    f.write(content)
