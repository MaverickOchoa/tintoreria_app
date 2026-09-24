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
                
        # 1. Clean order details (order_id)
        # Using branch_id to find orders since orders have branch_id.
        safe_execute("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE branch_id IN (SELECT id FROM branches WHERE business_id = :b))")
        safe_execute("DELETE FROM order_payments WHERE order_id IN (SELECT id FROM orders WHERE branch_id IN (SELECT id FROM branches WHERE business_id = :b))")
        safe_execute("DELETE FROM order_garment_tickets WHERE order_id IN (SELECT id FROM orders WHERE branch_id IN (SELECT id FROM branches WHERE business_id = :b))")
        
        # 2. Clean clinic tables linked via patient_id
        safe_execute("DELETE FROM clinical_form_entries WHERE patient_id IN (SELECT id FROM patients WHERE client_id IN (SELECT id FROM clients WHERE branch_id IN (SELECT id FROM branches WHERE business_id = :b)))")
        safe_execute("DELETE FROM clinical_records WHERE patient_id IN (SELECT id FROM patients WHERE client_id IN (SELECT id FROM clients WHERE branch_id IN (SELECT id FROM branches WHERE business_id = :b)))")
        safe_execute("DELETE FROM patients WHERE client_id IN (SELECT id FROM clients WHERE branch_id IN (SELECT id FROM branches WHERE business_id = :b))")
        
        # 3. Clean any table that has branch_id but NOT business_id
        # Actually it's safer to just delete from all tables with branch_id
        res_branch = db.execute(text("SELECT table_name FROM information_schema.columns WHERE column_name = 'branch_id' AND table_schema = 'public'"))
        branch_tables = [row[0] for row in res_branch.fetchall()]
        # Delete from branch tables (except branches itself)
        for tbl in branch_tables:
            if tbl not in ['branches', 'businesses']:
                safe_execute(f"DELETE FROM {tbl} WHERE branch_id IN (SELECT id FROM branches WHERE business_id = :b)")
                
        # 4. Clean any table that has business_id
        res_biz = db.execute(text("SELECT table_name FROM information_schema.columns WHERE column_name = 'business_id' AND table_schema = 'public'"))
        biz_tables = [row[0] for row in res_biz.fetchall()]
        
        # We need to make sure we don't delete from businesses yet
        # Some tables might have foreign keys to other biz tables (like employee_roles -> employees)
        # So we just repeat the deletion a few times until it stabilizes, or use safe_execute
        for _ in range(3):
            for tbl in biz_tables:
                if tbl not in ['businesses']:
                    safe_execute(f"DELETE FROM {tbl} WHERE business_id = :b")
                    
        # 5. Finally branches and businesses
        safe_execute("DELETE FROM branches WHERE business_id = :b")
        
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
