import re

with open('platform/verticals/clinic/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''    q = \(
        db\.query\(Patient\)
        \.join\(Patient\.client\)
        \.options\(joinedload\(Patient\.client\)\)
        \.filter\(
            \(Client\.branch_id\.in_\(branch_ids\)\) \| \(Client\.branch_id\.is_\(None\)\)
        \)
    \)'''

replacement = '''    q = (
        db.query(Patient)
        .join(Patient.client)
        .options(joinedload(Patient.client))
        .filter(Client.branch_id.in_(branch_ids))
    )'''

content = re.sub(pattern, replacement, content)

with open('platform/verticals/clinic/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
