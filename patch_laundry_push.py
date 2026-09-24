import re

with open('platform/verticals/laundry/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
import_pattern = r'from core.dependencies import get_current_claims'
import_replacement = 'from core.dependencies import get_current_claims\nfrom core.utils.push import dispatch_event\nfrom core.models.tenant import Branch'
if 'dispatch_event' not in content:
    content = content.replace(import_pattern, import_replacement)

# Find assign-carousel
target = '''    order.carousel_position = payload.carousel_position
    order.status = "Listo"
    db.commit()'''

replacement = '''    order.carousel_position = payload.carousel_position
    order.status = "Listo"
    db.commit()
    
    # Try sending Push Notification
    client = db.query(Client).filter(Client.id == order.client_id).first()
    branch = db.query(Branch).filter(Branch.id == order.branch_id).first()
    if client and branch:
        from core.utils.push import dispatch_event
        dispatch_event(db, "order_ready", branch.business_id, client, {"folio": order.folio or str(order.id)})
'''

if 'dispatch_event(db, "order_ready"' not in content:
    content = content.replace(target, replacement)

with open('platform/verticals/laundry/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
