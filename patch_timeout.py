import re

with open('platform/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

target = """        for stmt in _STARTUP_MIGRATIONS:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception as e:
                print(f"Migration warning: {e}")
                conn.rollback()"""

replacement = """        for stmt in _STARTUP_MIGRATIONS:
            try:
                conn.execute(text("SET lock_timeout = '3s';"))
                conn.execute(text(stmt))
                conn.commit()
            except Exception as e:
                print(f"Migration warning: {e}")
                conn.rollback()"""

content = content.replace(target, replacement)

with open('platform/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
