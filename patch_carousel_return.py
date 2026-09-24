import re

with open('platform/verticals/laundry/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''    order\.carousel_position = payload\.carousel_position
    order\.status = "Listo"
    db\.commit\(\)
    return order\.to_dict\(\)'''

replacement = '''    order.carousel_position = payload.carousel_position
    order.status = "Listo"
    db.commit()
    db.refresh(order)
    return {"message": "Posición asignada", "order": order.to_dict()}'''

content = re.sub(pattern, replacement, content)

with open('platform/verticals/laundry/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
