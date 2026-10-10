import re

with open('platform/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# remove the broken try/except block
block = """        # Add gender column safely
        try:
            from sqlalchemy import text
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE hs_students ADD COLUMN gender VARCHAR(10) DEFAULT 'unspecified'"))
                conn.commit()
        except Exception:
            pass"""

content = content.replace(block, "")

with open('platform/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
