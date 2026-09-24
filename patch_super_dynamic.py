import re

with open('platform/core/routes/tenants.py', 'r', encoding='utf-8') as f:
    content = f.read()

cascade_delete = '''
@router.delete("/businesses/{business_id}")
def delete_business(business_id: int, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    
    try:
        from sqlalchemy import text
        
        def safe_execute(sql):
            try:
                with db.begin_nested():
                    db.execute(text(sql), {"b": business_id})
            except Exception:
                pass
                
        def get_tables(col):
            res = db.execute(text(f"SELECT table_name FROM information_schema.columns WHERE column_name = '{col}' AND table_schema = 'public'"))
            return [r[0] for r in res.fetchall()]

        # 1. order_id dependencies
        for tbl in get_tables('order_id'):
            safe_execute(f"DELETE FROM {tbl} WHERE order_id IN (SELECT id FROM orders WHERE branch_id IN (SELECT id FROM branches WHERE business_id = :b))")
            
        # 2. patient_id dependencies
        for tbl in get_tables('patient_id'):
            safe_execute(f"DELETE FROM {tbl} WHERE patient_id IN (SELECT id FROM patients WHERE client_id IN (SELECT id FROM clients WHERE branch_id IN (SELECT id FROM branches WHERE business_id = :b)))")
            
        # 3. client_id dependencies
        for tbl in get_tables('client_id'):
            if tbl != 'patients':
                safe_execute(f"DELETE FROM {tbl} WHERE client_id IN (SELECT id FROM clients WHERE branch_id IN (SELECT id FROM branches WHERE business_id = :b))")
                
        # 4. employee_id dependencies
        for tbl in get_tables('employee_id'):
            safe_execute(f"DELETE FROM {tbl} WHERE employee_id IN (SELECT id FROM employees WHERE business_id = :b)")

        # 5. patient and client tables themselves
        safe_execute("DELETE FROM patients WHERE client_id IN (SELECT id FROM clients WHERE branch_id IN (SELECT id FROM branches WHERE business_id = :b))")
        safe_execute("DELETE FROM clients WHERE branch_id IN (SELECT id FROM branches WHERE business_id = :b)")
        
        # 6. branch_id dependencies
        for tbl in get_tables('branch_id'):
            if tbl not in ['branches', 'businesses']:
                safe_execute(f"DELETE FROM {tbl} WHERE branch_id IN (SELECT id FROM branches WHERE business_id = :b)")
                
        # 7. business_id dependencies (run a few times to stabilize internal fk)
        biz_tables = get_tables('business_id')
        for _ in range(3):
            for tbl in biz_tables:
                if tbl not in ['businesses']:
                    safe_execute(f"DELETE FROM {tbl} WHERE business_id = :b")
                    
        # 8. Finally branches and businesses
        db.execute(text("DELETE FROM branches WHERE business_id = :b"), {"b": business_id})
        db.execute(text("DELETE FROM businesses WHERE id = :b"), {"b": business_id})
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"No se pudo eliminar el negocio. Existen registros vinculados. Error: {str(e)}")
    
    return {"message": "Negocio eliminado exitosamente."}
'''

pattern = r'@router\.delete\("/businesses/\{business_id\}"\).*?return \{"message": "Negocio eliminado exitosamente\."\}'
content = re.sub(pattern, cascade_delete, content, flags=re.DOTALL)

with open('platform/core/routes/tenants.py', 'w', encoding='utf-8') as f:
    f.write(content)
