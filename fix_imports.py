import os

def fix_imports(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # If they are imported from core.security, change it
    # E.g. from core.security import require_business_admin, get_current_claims
    # Actually it's easier to just do simple string replacements
    import re
    # Find all 'from core.security import ...'
    # Wait, some things like `get_password_hash` might actually be in core.security.
    # Let's just fix the specific names.
    names_to_move = ['require_business_admin', 'require_super_admin', 'get_current_claims']
    
    modified = False
    
    # We will just replace `from core.security import ...` if they contain those.
    # A simpler way:
    content = content.replace("from core.security import require_business_admin, get_current_claims", "from core.dependencies import require_business_admin, get_current_claims")
    content = content.replace("from core.security import require_super_admin, get_current_claims", "from core.dependencies import require_super_admin, get_current_claims")
    content = content.replace("from core.security import require_super_admin, get_password_hash", "from core.dependencies import require_super_admin\nfrom core.security import hash_password as get_password_hash")
    content = content.replace("from core.security import get_current_claims", "from core.dependencies import get_current_claims")
    
    if content != open(file_path, 'r', encoding='utf-8').read():
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {file_path}")

files_to_check = [
    'platform/core/routes/overrides.py',
    'platform/core/routes/agencies.py',
    'platform/core/routes/promotions.py',
    'platform/core/routes/reports.py',
    'platform/verticals/laundry/routes.py'
]

for f in files_to_check:
    if os.path.exists(f):
        fix_imports(f)
