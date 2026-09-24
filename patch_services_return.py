import re

with open('platform/verticals/laundry/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''    return \{
        "services_seeded": \[s\.to_dict\(\) for s in services\],
        "colors_count": colors,
        "prints_count": prints,
        "defects_count": defects
    \}'''

replacement = '''    return {"services": [s.to_dict() for s in services]}'''

content = re.sub(pattern, replacement, content)

with open('platform/verticals/laundry/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
