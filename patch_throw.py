import re

with open('platform/core/routes/tenants.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace safe_execute for branches with db.execute
pattern = r'safe_execute\("DELETE FROM branches WHERE business_id = :b"\)'
replacement = 'db.execute(text("DELETE FROM branches WHERE business_id = :b"), {"b": business_id})'

content = re.sub(pattern, replacement, content)

with open('platform/core/routes/tenants.py', 'w', encoding='utf-8') as f:
    f.write(content)
