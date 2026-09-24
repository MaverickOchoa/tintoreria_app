import re

with open('platform/core/routes/tenants.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace safe_execute definition
old_safe = '''        def safe_execute(sql):
            try:
                db.execute(text("SAVEPOINT sp1"))
                db.execute(text(sql), {"b": business_id})
                db.execute(text("RELEASE SAVEPOINT sp1"))
            except Exception as e:
                db.execute(text("ROLLBACK TO SAVEPOINT sp1"))'''

new_safe = '''        def safe_execute(sql):
            try:
                with db.begin_nested():
                    db.execute(text(sql), {"b": business_id})
            except Exception:
                pass'''

content = content.replace(old_safe, new_safe)

with open('platform/core/routes/tenants.py', 'w', encoding='utf-8') as f:
    f.write(content)
