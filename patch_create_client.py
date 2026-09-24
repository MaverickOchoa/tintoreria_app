import re

with open('platform/core/routes/clients.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import for generate_password_hash if not present
if "generate_password_hash" not in content:
    content = content.replace("from sqlalchemy.orm import Session", "from sqlalchemy.orm import Session\nfrom werkzeug.security import generate_password_hash")

create_logic_old = '''    for k in ["username", "whatsapp_consent", "email_consent"]:
        dump.pop(k, None)

    client = Client(**dump, full_name=full_name, street_and_number=street_and_number)'''

create_logic_new = '''    for k in ["username", "whatsapp_consent", "email_consent"]:
        dump.pop(k, None)

    # Auto-generate username and password for portal access
    base_user = full_name.split()[0].lower() if full_name else "user"
    base_user = base_user.replace(' ', '')
    username = base_user
    counter = 1
    while db.query(Client).filter(Client.username == username).first():
        username = f"{base_user}{counter}"
        counter += 1
    
    password_hash = generate_password_hash(payload.phone) if payload.phone else generate_password_hash("1234567890")

    client = Client(**dump, full_name=full_name, street_and_number=street_and_number, username=username, password=password_hash)'''

content = content.replace(create_logic_old, create_logic_new)

with open('platform/core/routes/clients.py', 'w', encoding='utf-8') as f:
    f.write(content)
