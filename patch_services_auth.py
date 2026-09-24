import re

with open('platform/verticals/laundry/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("claims: dict = Depends(require_super_admin)", "claims: dict = Depends(get_current_claims)")

with open('platform/verticals/laundry/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
