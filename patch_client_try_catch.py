import re

with open('platform/core/routes/clients.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''    client = Client\(\*\*dump, full_name=full_name, street_and_number=street_and_number\)
    db\.add\(client\)
    db\.commit\(\)
    db\.refresh\(client\)'''

replacement = '''    client = Client(**dump, full_name=full_name, street_and_number=street_and_number)
    try:
        db.add(client)
        db.commit()
        db.refresh(client)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))'''

content = re.sub(pattern, replacement, content)

with open('platform/core/routes/clients.py', 'w', encoding='utf-8') as f:
    f.write(content)
