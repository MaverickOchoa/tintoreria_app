import re

with open('platform/verticals/laundry/routes.py', encoding='utf-8') as f:
    content = f.read()

new_routes = '''

@router.put("/categories/{category_id}")
def update_category(category_id: int, payload: CategoryCreate, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category no encontrada")
    cat.name = payload.name
    db.commit()
    db.refresh(cat)
    return cat.to_dict()

@router.delete("/categories/{category_id}")
def delete_category(category_id: int, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category no encontrada")
    try:
        db.delete(cat)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="No se puede eliminar la categoría porque hay ítems que la usan.")
    return {"message": "Categoría eliminada"}

@router.put("/services/{service_id}")
def update_service(service_id: int, payload: ServiceCreate, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    srv = db.query(Service).filter(Service.id == service_id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Service no encontrado")
    srv.name = payload.name
    srv.price_modifier = payload.price_modifier
    db.commit()
    db.refresh(srv)
    return srv.to_dict()

@router.delete("/services/{service_id}")
def delete_service(service_id: int, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    srv = db.query(Service).filter(Service.id == service_id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Service no encontrado")
    try:
        db.delete(srv)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="No se puede eliminar el servicio porque hay órdenes que lo usan.")
    return {"message": "Servicio eliminado"}
'''

if "@router.delete(\"/categories/{category_id}\")" not in content:
    content += new_routes
    with open('platform/verticals/laundry/routes.py', 'w', encoding='utf-8') as f:
        f.write(content)
