import re

with open('frontend/src/components/EditClient.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'const numFields = \["date_of_birth_day", "date_of_birth_month", "zip_code", "client_type_id"\];'
replacement = r'const numFields = ["date_of_birth_day", "date_of_birth_month", "client_type_id"];'

content = re.sub(pattern, replacement, content)

with open('frontend/src/components/EditClient.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
