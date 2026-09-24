import re

with open('platform/core/routes/clients.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''    for field, value in payload\.model_dump\(exclude_none=True\)\.items\(\):
        setattr\(client, field, value\)'''

replacement = '''    dump = payload.model_dump(exclude_none=True)
    if "first_name" in dump:
        dump["full_name"] = dump.pop("first_name")
    if "street_number" in dump:
        dump["street_and_number"] = dump.pop("street_number")
        
    for k in ["username", "whatsapp_consent", "email_consent"]:
        dump.pop(k, None)

    for field, value in dump.items():
        setattr(client, field, value)'''

content = re.sub(pattern, replacement, content)

with open('platform/core/routes/clients.py', 'w', encoding='utf-8') as f:
    f.write(content)
