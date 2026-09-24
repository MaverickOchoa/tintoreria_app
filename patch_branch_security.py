import re

with open('platform/core/routes/tenants.py', 'r', encoding='utf-8') as f:
    content = f.read()

def inject_security(pattern):
    return pattern.replace(
        'if not branch: raise HTTPException(status_code=404)',
        'if not branch: raise HTTPException(status_code=404)\n    if branch.business_id != claims.get("business_id"): raise HTTPException(status_code=403, detail="Acceso denegado a esta sucursal")'
    )

content = content.replace(
    'if not branch: raise HTTPException(status_code=404)',
    'if not branch: raise HTTPException(status_code=404)\n    if branch.business_id != claims.get("business_id"): raise HTTPException(status_code=403, detail="Acceso denegado a esta sucursal")'
)

# And let's fix require_business_admin in dependencies.py so super admins CAN do things if they want?
# Actually, the user says: "solo los duenos (el primer usuario y contrasena con la que se creo el negocio) puede hacer todo dentro del negocio, depues tenemos ferentes y luego empleados. cada uno ya tien se restriccion."
# So business_admin is fine.

with open('platform/core/routes/tenants.py', 'w', encoding='utf-8') as f:
    f.write(content)
