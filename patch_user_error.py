import re

with open('platform/core/routes/users.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''    employee = Employee\(
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
    employee\.roles = roles
    db\.add\(employee\)
    db\.commit\(\)
    db\.refresh\(employee\)'''

replacement = '''    employee = Employee(
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
    employee.roles = roles
    try:
        db.add(employee)
        db.commit()
        db.refresh(employee)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))'''

content = re.sub(pattern, replacement, content)

with open('platform/core/routes/users.py', 'w', encoding='utf-8') as f:
    f.write(content)
