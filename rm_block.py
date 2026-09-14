import re

with open('platform/verticals/clinic/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the second occurrence of '@router.get("/doctors/{doctor_id}/schedule")'
# and delete everything from there to '# Finance / Caja'

parts = content.split('@router.get("/doctors/{doctor_id}/schedule")')
if len(parts) >= 3:
    # There are at least two occurrences. We want to delete the last one.
    # parts[0] is everything before first
    # parts[1] is between first and second
    # parts[2] is everything after second
    
    # But wait, is there a third?
    print("Found", len(parts)-1, "occurrences")
    
    after_second = parts[2]
    finance_idx = after_second.find('# Finance / Caja (Ingresos y Egresos)')
    if finance_idx != -1:
        new_after_second = after_second[finance_idx:]
        new_content = parts[0] + '@router.get("/doctors/{doctor_id}/schedule")' + parts[1] + "\n# ==========================================\n" + new_after_second
        with open('platform/verticals/clinic/routes.py', 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Success")
    else:
        print("Finance section not found")
else:
    print("Could not find two occurrences")
