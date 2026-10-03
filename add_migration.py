import re
content = open('platform/main.py', encoding='utf-8').read()
mig = '    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);",'
new_mig = mig + '\n    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS recall_date TIMESTAMP;",\n    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS recall_reason TEXT;",'
content = content.replace(mig, new_mig)
open('platform/main.py', 'w', encoding='utf-8').write(content)
