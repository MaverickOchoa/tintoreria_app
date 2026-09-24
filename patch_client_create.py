import re

with open('platform/core/routes/clients.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''    if db\.query\(Client\)\.filter\(Client\.phone == payload\.phone\)\.first\(\):
        raise HTTPException\(status_code=409, detail="Ya existe un cliente con ese telǸfono\."\)
    client = Client\(\*\*payload\.model_dump\(\)\)
    db\.add\(client\)'''

replacement = '''    if db.query(Client).filter(Client.phone == payload.phone).first():
        raise HTTPException(status_code=409, detail="Ya existe un cliente con ese telǸfono.")
    if payload.email and db.query(Client).filter(Client.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Este correo ya estǭ registrado en otro cliente.")

    dump = payload.model_dump()
    # Map frontend fields to backend model fields
    full_name = dump.pop("first_name", None) or dump.pop("full_name", None) or ""
    street_and_number = dump.pop("street_number", None) or dump.pop("street_and_number", None)
    
    # Remove fields that are not in the DB model
    dump.pop("username", None)
    dump.pop("whatsapp_consent", None)
    dump.pop("email_consent", None)

    client = Client(**dump, full_name=full_name, street_and_number=street_and_number)
    db.add(client)'''

content = re.sub(pattern, replacement, content)

with open('platform/core/routes/clients.py', 'w', encoding='utf-8') as f:
    f.write(content)
