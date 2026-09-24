import re

with open('platform/core/routes/users.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''    business_id = claims\["business_id"\]

    username = generate_unique_username\(payload\.full_name, payload\.last_name or "", db\)
    temp_password = payload\.phone\.strip\(\) if payload\.phone else "zentro2024"

    roles = db\.query\(Role\)\.filter\(Role\.name\.in_\(payload\.role_names\)\)\.all\(\)
    employee = Employee\(
        username=username,
        password=hash_password\(temp_password\),
        full_name=payload\.full_name,
        last_name=payload\.last_name,
        email=payload\.email,
        phone=payload\.phone,
        specialty=payload\.specialty,
        branch_id=payload\.branch_id,
        business_id=business_id,
        must_change_password=True,
    \)
    employee\.roles = roles'''

replacement = '''    business_id = claims["business_id"]

    username = payload.base_username or generate_unique_username(payload.full_name, payload.last_name or "", db)
    temp_password = payload.password or (payload.phone.strip() if payload.phone else "zentro2024")

    # Fetch roles by ID if role_ids provided, otherwise by name
    if payload.role_ids:
        roles = db.query(Role).filter(Role.id.in_(payload.role_ids)).all()
    else:
        roles = db.query(Role).filter(Role.name.in_(payload.role_names)).all()
        
    employee = Employee(
        username=username,
        password=hash_password(temp_password),
        full_name=payload.full_name,
        last_name=payload.last_name,
        email=payload.email,
        phone=payload.phone,
        specialty=payload.specialty,
        branch_id=payload.branch_id,
        business_id=business_id,
        must_change_password=True,
    )
    employee.roles = roles'''

content = re.sub(pattern, replacement, content)

with open('platform/core/routes/users.py', 'w', encoding='utf-8') as f:
    f.write(content)
