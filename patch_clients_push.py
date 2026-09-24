import re

with open('platform/core/routes/clients.py', 'r', encoding='utf-8') as f:
    content = f.read()

import_pattern = r'from core.dependencies import get_current_claims, require_business_admin'
import_replacement = 'from core.dependencies import get_current_claims, require_business_admin\nfrom core.utils.push import dispatch_event\nfrom core.models.tenant import Branch'
if 'dispatch_event' not in content:
    content = content.replace(import_pattern, import_replacement)

# Find where client is created and returned
target = '''    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return client.to_dict()'''

replacement = '''    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
        
    branch = db.query(Branch).filter(Branch.id == client.branch_id).first()
    if branch:
        dispatch_event(db, "client_welcome", branch.business_id, client, {"plain_password": payload.phone if payload.phone else "1234567890"})
        
    return client.to_dict()'''

if 'dispatch_event(db, "client_welcome"' not in content:
    content = content.replace(target, replacement)

with open('platform/core/routes/clients.py', 'w', encoding='utf-8') as f:
    f.write(content)
