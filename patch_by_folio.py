import re

with open('platform/verticals/laundry/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

new_route = """
@router.get("/orders/by-folio/{folio}")
def get_order_by_folio(folio: str, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    branch_id = int(claims.get("active_branch_id") or claims.get("branch_id") or 0)
    q = db.query(Order).filter(Order.folio == folio)
    if branch_id:
        q = q.filter(Order.branch_id == branch_id)
    order = q.first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    
    # Check permissions (super admin or same business)
    if not claims.get("is_super_admin"):
        branch = db.query(Branch).filter(Branch.id == order.branch_id).first()
        if not branch or branch.business_id != claims.get("business_id"):
            raise HTTPException(status_code=403, detail="Acceso denegado a esta orden")
            
    # Auto-update status to 'En Producción' if it's 'Pendiente' or 'Creada'
    if order.status in ('Creada', 'Pendiente'):
        order.status = 'En Producción'
        db.commit()
        
    return order.to_dict()
"""

if "@router.get(\"/orders/by-folio/{folio}\")" not in content:
    content = content.replace(
        '@router.post("/orders/{order_id}/scan-garment")',
        new_route + '\n\n@router.post("/orders/{order_id}/scan-garment")'
    )

with open('platform/verticals/laundry/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
