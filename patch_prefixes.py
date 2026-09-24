import re

def strip_prefix(file_path, prefix):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace(f'prefix="{prefix}", ', '')
    content = content.replace(f'prefix="{prefix}"', '')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

strip_prefix('platform/verticals/laundry/routes.py', '/laundry')
strip_prefix('platform/verticals/clinic/routes.py', '/clinic')
