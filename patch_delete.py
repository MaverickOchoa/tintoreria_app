import re

with open('platform/core/routes/tenants.py', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to replace the delete_business function with one that does manual cascading.

cascade_delete = '''
@router.delete("/businesses/{business_id}")
def delete_business(business_id: int, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    
    try:
        # We must manually delete dependent records if the DB doesn't have ON DELETE CASCADE.
        # Since SQLAlchemy metadata knows about the tables, we can execute raw SQL to delete them.
        tables = [
            "whatsapp_templates", "email_templates", "trigger_channel_config", "date_campaigns",
            "colors", "prints", "defects",
            "promotions", "promo_required_lines", "promo_reward_lines",
            "expenses", "agency_businesses",
            "order_items", "order_payments", "orders", 
            "clinical_records", "clinic_doctor_schedules", "clinic_doctor_blocks", "clinic_appointments", "clinic_patients", "clinic_services",
            "employees", "employee_roles", "roles",
            "items", "categories", "services",
            "clients", "client_types",
            "business_hours", "business_holidays",
            "branch_item_overrides", "branches",
            "admins"
        ]
        
        # Some tables reference business_id directly, others reference branch_id.
        # For safety, let's delete anything that references business_id.
        # This requires raw SQL.
        from sqlalchemy import text
        
        # 1. Delete order-related stuff (they link to branches)
        db.execute(text("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE branch_id IN (SELECT id FROM branches WHERE business_id = :b))"), {"b": business_id})
        db.execute(text("DELETE FROM order_payments WHERE order_id IN (SELECT id FROM orders WHERE branch_id IN (SELECT id FROM branches WHERE business_id = :b))"), {"b": business_id})
        db.execute(text("DELETE FROM orders WHERE branch_id IN (SELECT id FROM branches WHERE business_id = :b)"), {"b": business_id})
        
        # 2. Clinic stuff
        db.execute(text("DELETE FROM clinical_records WHERE patient_id IN (SELECT id FROM clinic_patients WHERE business_id = :b)"), {"b": business_id})
        db.execute(text("DELETE FROM clinic_appointments WHERE business_id = :b"), {"b": business_id})
        db.execute(text("DELETE FROM clinic_patients WHERE business_id = :b"), {"b": business_id})
        db.execute(text("DELETE FROM clinic_services WHERE business_id = :b"), {"b": business_id})
        db.execute(text("DELETE FROM clinic_doctor_schedules WHERE doctor_id IN (SELECT id FROM employees WHERE business_id = :b)"), {"b": business_id})
        db.execute(text("DELETE FROM clinic_doctor_blocks WHERE doctor_id IN (SELECT id FROM employees WHERE business_id = :b)"), {"b": business_id})
        
        # 3. Employees & Roles
        db.execute(text("DELETE FROM employee_roles WHERE employee_id IN (SELECT id FROM employees WHERE business_id = :b)"), {"b": business_id})
        db.execute(text("DELETE FROM roles WHERE employee_id IN (SELECT id FROM employees WHERE business_id = :b)"), {"b": business_id})
        db.execute(text("DELETE FROM employees WHERE business_id = :b"), {"b": business_id})
        
        # 4. Promotions
        db.execute(text("DELETE FROM promo_required_lines WHERE promotion_id IN (SELECT id FROM promotions WHERE business_id = :b)"), {"b": business_id})
        db.execute(text("DELETE FROM promo_reward_lines WHERE promotion_id IN (SELECT id FROM promotions WHERE business_id = :b)"), {"b": business_id})
        
        # 5. Direct business_id dependencies
        direct_tables = [
            "whatsapp_templates", "email_templates", "trigger_channel_config", "date_campaigns",
            "colors", "prints", "defects", "promotions", "expenses",
            "items", "categories", "services", "client_types", "clients",
            "business_hours", "business_holidays", "agency_businesses", "admins"
        ]
        
        for table in direct_tables:
            try:
                db.execute(text(f"DELETE FROM {table} WHERE business_id = :b"), {"b": business_id})
            except Exception as ex:
                pass # Table might not have business_id or not exist
                
        # 6. Branch overrides
        db.execute(text("DELETE FROM branch_item_overrides WHERE branch_id IN (SELECT id FROM branches WHERE business_id = :b)"), {"b": business_id})
        
        # 7. Branches
        db.execute(text("DELETE FROM branches WHERE business_id = :b"), {"b": business_id})
        
        # Finally delete business
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
