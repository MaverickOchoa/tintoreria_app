import re

with open('platform/main.py', encoding='utf-8') as f:
    content = f.read()

target = '"ALTER TABLE patients ADD COLUMN IF NOT EXISTS chief_complaint TEXT",'
replacement = target + '''
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS recall_date TIMESTAMP",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS recall_reason TEXT",'''

if "recall_date" not in content:
    content = content.replace(target, replacement)
    with open('platform/main.py', 'w', encoding='utf-8') as f:
        f.write(content)
