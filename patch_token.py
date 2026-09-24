import re

with open('platform/core/routes/client_portal.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = '''    additional = {
        "role": "client",
        "client_id": client.id,
        "business_id": business_id,
        "branch_id": client.branch_id,
        "is_super_admin": False,
    }
    
    token = create_access_token(subject=str(client.id), extra_claims=additional)'''

new_logic = '''    token_data = {
        "sub": str(client.id),
        "role": "client",
        "client_id": client.id,
        "business_id": business_id,
        "branch_id": client.branch_id,
        "is_super_admin": False,
    }
    
    token = create_access_token(token_data)'''

if old_logic in content:
    content = content.replace(old_logic, new_logic)
else:
    print("WARNING: Could not find old_logic string")

with open('platform/core/routes/client_portal.py', 'w', encoding='utf-8') as f:
    f.write(content)
