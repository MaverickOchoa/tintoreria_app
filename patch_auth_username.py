import re

with open('platform/core/routes/auth.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix super_admin token
super_admin_pattern = r'''            token_data = \{"sub": user\.username, "is_super_admin": True, "role": "super_admin"\}'''
super_admin_replacement = '''            token_data = {"sub": user.username, "is_super_admin": True, "role": "super_admin", "username": user.username, "full_name": "Super Admin"}'''
content = re.sub(super_admin_pattern, super_admin_replacement, content)

# Fix business_admin token
biz_admin_pattern = r'''        token_data = \{
            "sub": user\.username,
            "is_super_admin": False,
            "business_id": user\.business_id,
            "active_branch_id": user\.branch_id,
            "role": "business_admin",
            "vertical_type": business\.vertical_type if business else "laundry",
        \}'''
biz_admin_replacement = '''        token_data = {
            "sub": user.username,
            "is_super_admin": False,
            "business_id": user.business_id,
            "active_branch_id": user.branch_id,
            "role": "business_admin",
            "username": user.username,
            "full_name": user.username,
            "vertical_type": business.vertical_type if business else "laundry",
        }'''
content = re.sub(biz_admin_pattern, biz_admin_replacement, content)

# Fix employee token
employee_pattern = r'''        token_data = \{
            "sub": employee\.username,
            "is_super_admin": False,
            "business_id": employee\.business_id,
            "branch_id": employee\.branch_id,
            "employee_id": employee\.id,
            "roles": role_names,
            "role": role_names\[0\] if role_names else "employee",
            "vertical_type": business\.vertical_type if business else "laundry",
        \}'''
employee_replacement = '''        token_data = {
            "sub": employee.username,
            "is_super_admin": False,
            "business_id": employee.business_id,
            "branch_id": employee.branch_id,
            "employee_id": employee.id,
            "roles": role_names,
            "role": role_names[0] if role_names else "employee",
            "username": employee.username,
            "full_name": employee.full_name,
            "vertical_type": business.vertical_type if business else "laundry",
        }'''
content = re.sub(employee_pattern, employee_replacement, content)

with open('platform/core/routes/auth.py', 'w', encoding='utf-8') as f:
    f.write(content)
