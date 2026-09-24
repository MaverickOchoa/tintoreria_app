import re

with open('platform/core/routes/clients.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''    dump = payload\.model_dump\(\)
    full_name = dump\.pop\("first_name", None\) or dump\.pop\("full_name", None\) or ""
    street_and_number = dump\.pop\("street_number", None\) or dump\.pop\("street_and_number", None\)'''

replacement = '''    dump = payload.model_dump()
    fn1 = dump.pop("first_name", None)
    fn2 = dump.pop("full_name", None)
    full_name = fn1 or fn2 or ""
    
    sn1 = dump.pop("street_number", None)
    sn2 = dump.pop("street_and_number", None)
    street_and_number = sn1 or sn2'''

content = re.sub(pattern, replacement, content)

with open('platform/core/routes/clients.py', 'w', encoding='utf-8') as f:
    f.write(content)
