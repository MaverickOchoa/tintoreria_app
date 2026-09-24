import re

with open('platform/core/routes/auth.py', 'r', encoding='utf-8') as f:
    content = f.read()

employee_pattern = r'''        token_data = \{
            "sub": employee\.username,
            "is_super_admin": False,
            "business_id": employee\.business_id,
            "branch_id": employee\.branch_id,
            "employee_id": employee\.id,
            "roles": role_names,
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
            "vertical_type": business.vertical_type if business else "laundry",
        }'''

content = re.sub(employee_pattern, employee_replacement, content)

with open('platform/core/routes/auth.py', 'w', encoding='utf-8') as f:
    f.write(content)
