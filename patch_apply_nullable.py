import re

# 1. Update models.py
with open('platform/verticals/laundry/models.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)',
    'employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)'
)

with open('platform/verticals/laundry/models.py', 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Update services.py
with open('platform/verticals/laundry/services.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''    if not emp_id:
        raise HTTPException\(status_code=400, detail="No se encontró empleado para esta sucursal\."\)'''
replacement = r'''    # if not emp_id:
    #     raise HTTPException(status_code=400, detail="No se encontró empleado para esta sucursal.")'''
content = re.sub(pattern, replacement, content)

with open('platform/verticals/laundry/services.py', 'w', encoding='utf-8') as f:
    f.write(content)

# 3. Update main.py with migration
with open('platform/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

migration = '    "ALTER TABLE orders ALTER COLUMN employee_id DROP NOT NULL;",'
if migration not in content:
    content = content.replace(
        '    # Clinic Expenses',
        migration + '\n    # Clinic Expenses'
    )

with open('platform/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
