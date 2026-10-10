import re

with open('platform/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

migration_string = '"ALTER TABLE clinical_form_entries ADD COLUMN IF NOT EXISTS filled_pdf_url TEXT",'

new_migration = '"ALTER TABLE clinical_form_entries ADD COLUMN IF NOT EXISTS filled_pdf_url TEXT",\n    "ALTER TABLE hs_students ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT \'unspecified\'",'

content = content.replace(migration_string, new_migration)

with open('platform/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
