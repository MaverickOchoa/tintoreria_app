import re

with open('platform/verticals/laundry/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''@router\.get\("/seed_hex"\)
def seed_hex_colors\(db: Session = Depends\(get_db\)\):.*?(?=@router|$)'''

# We just remove the route.
content = re.sub(pattern, '', content, flags=re.DOTALL)

with open('platform/verticals/laundry/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
