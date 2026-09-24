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
        
        # Helper to execute without failing the transaction if table/column doesn't exist
        def safe_execute(sql):
            try:
                db.execute(text("SAVEPOINT sp1"))
                db.execute(text(sql), {"b": business_id})
                db.execute(text("RELEASE SAVEPOINT sp1"))
            except Exception as e:
                db.execute(text("ROLLBACK TO SAVEPOINT sp1"))
        
        # 1. Orders
        safe_execute("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE branch_id IN (SELECT id FROM branches WHERE business_id = :b))")
        safe_execute("DELETE FROM order_payments WHERE order_id IN (SELECT id FROM orders WHERE branch_id IN (SELECT id FROM branches WHERE business_id = :b))")
        safe_execute("DELETE FROM orders WHERE branch_id IN (SELECT id FROM branches WHERE business_id = :b)")
        
        # 2. Clinic
        safe_execute("DELETE FROM clinical_form_entries WHERE patient_id IN (SELECT id FROM patients WHERE client_id IN (SELECT id FROM clients WHERE business_id = :b))")
        safe_execute("DELETE FROM clinical_records WHERE patient_id IN (SELECT id FROM patients WHERE client_id IN (SELECT id FROM clients WHERE business_id = :b))")
        safe_execute("DELETE FROM appointments WHERE business_id = :b")
        safe_execute("DELETE FROM patients WHERE client_id IN (SELECT id FROM clients WHERE business_id = :b)")
        safe_execute("DELETE FROM clinic_services WHERE business_id = :b")
        safe_execute("DELETE FROM clinic_doctor_schedules WHERE doctor_id IN (SELECT id FROM employees WHERE business_id = :b)")
        safe_execute("DELETE FROM clinic_doctor_blocks WHERE doctor_id IN (SELECT id FROM employees WHERE business_id = :b)")
        
        # 3. Employees
        safe_execute("DELETE FROM employee_roles WHERE employee_id IN (SELECT id FROM employees WHERE business_id = :b)")
        safe_execute("DELETE FROM roles WHERE employee_id IN (SELECT id FROM employees WHERE business_id = :b)")
        safe_execute("DELETE FROM employees WHERE business_id = :b")
        
        # 4. Promotions
        safe_execute("DELETE FROM promo_required_lines WHERE promotion_id IN (SELECT id FROM promotions WHERE business_id = :b)")
        safe_execute("DELETE FROM promo_reward_lines WHERE promotion_id IN (SELECT id FROM promotions WHERE business_id = :b)")
        
        # 5. Direct
        tables = [
            "whatsapp_templates", "email_templates", "trigger_channel_config", "date_campaigns",
            "colors", "prints", "defects", "promotions", "clinic_expenses", "expenses",
            "items", "categories", "services", "client_types", "clients",
            "business_hours", "business_holidays", "agency_businesses", "admins"
        ]
        for table in tables:
            safe_execute(f"DELETE FROM {table} WHERE business_id = :b")
            
        # 6. Branches
        safe_execute("DELETE FROM branch_item_overrides WHERE branch_id IN (SELECT id FROM branches WHERE business_id = :b)")
        safe_execute("DELETE FROM branches WHERE business_id = :b")
        
        # Final delete
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
