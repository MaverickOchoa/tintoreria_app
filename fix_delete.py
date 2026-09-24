import re

# 1. Update frontend routes for DELETE
frontend_path = 'frontend/src/components/ManageBusinesses.jsx'
with open(frontend_path, encoding='utf-8') as f:
    content = f.read()

content = content.replace('`${API_BASE_URL}/businesses/${id}/toggle`', '`${API_BASE_URL}/businesses/${id}`')
content = content.replace('`${API_BASE_URL}/branches/${branchId}/toggle`', '`${API_BASE_URL}/branches/${branchId}`')

with open(frontend_path, 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Add backend DELETE routes
backend_path = 'platform/core/routes/tenants.py'
with open(backend_path, encoding='utf-8') as f:
    backend = f.read()

if "@router.delete(" not in backend:
    new_routes = '''

@router.delete("/businesses/{business_id}")
def delete_business(business_id: int, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    
    # We just delete the business and rely on SQL constraints if possible.
    try:
        db.delete(business)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"No se pudo eliminar el negocio. Existen registros vinculados. Error: {str(e)}")
    
    return {"message": "Negocio eliminado exitosamente."}

@router.delete("/branches/{branch_id}")
def delete_branch(branch_id: int, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")
        
    try:
        db.delete(branch)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"No se pudo eliminar la sucursal. Existen registros vinculados. Error: {str(e)}")
        
    return {"message": "Sucursal eliminada exitosamente."}
'''
    backend += new_routes
    with open(backend_path, 'w', encoding='utf-8') as f:
        f.write(backend)
