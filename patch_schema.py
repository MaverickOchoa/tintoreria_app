import re

with open('platform/core/schemas/tenant.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add to BusinessUpdate
update_pattern = r'''class BusinessUpdate\(BaseModel\):
    name: Optional\[str\] = None'''

update_replacement = '''class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    portal_primary_color: Optional[str] = None
    portal_bg_color: Optional[str] = None
    portal_slogan: Optional[str] = None
    portal_logo_url: Optional[str] = None'''

content = re.sub(update_pattern, update_replacement, content)

with open('platform/core/schemas/tenant.py', 'w', encoding='utf-8') as f:
    f.write(content)
