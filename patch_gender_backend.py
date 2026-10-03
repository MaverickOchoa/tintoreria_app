import re

# 1. Update models.py
with open('platform/verticals/homeschool/models.py', 'r', encoding='utf-8') as f:
    models_content = f.read()

models_content = models_content.replace(
    'date_of_birth = Column(DateTime)',
    'date_of_birth = Column(DateTime)\n    gender = Column(String(10), default="unspecified") # "boy" or "girl"'
)
with open('platform/verticals/homeschool/models.py', 'w', encoding='utf-8') as f:
    f.write(models_content)

# 2. Update routes.py
with open('platform/verticals/homeschool/routes.py', 'r', encoding='utf-8') as f:
    routes_content = f.read()

routes_content = routes_content.replace(
    '"bilingual_preference": s.bilingual_preference',
    '"bilingual_preference": s.bilingual_preference, "gender": getattr(s, "gender", "unspecified")'
)
routes_content = routes_content.replace(
    '"bilingual_preference": student.bilingual_preference}',
    '"bilingual_preference": student.bilingual_preference, "gender": getattr(student, "gender", "unspecified")}'
)
routes_content = routes_content.replace(
    'class StudentCreate(BaseModel):\n    first_name: str\n    last_name: str\n    grade_id: int\n    date_of_birth: str = None\n    bilingual_preference: str = "es"',
    'class StudentCreate(BaseModel):\n    first_name: str\n    last_name: str\n    grade_id: int\n    date_of_birth: str = None\n    bilingual_preference: str = "es"\n    gender: str = "unspecified"'
)

routes_content = routes_content.replace(
    'bilingual_preference=data.bilingual_preference',
    'bilingual_preference=data.bilingual_preference,\n        gender=data.gender'
)

with open('platform/verticals/homeschool/routes.py', 'w', encoding='utf-8') as f:
    f.write(routes_content)

# 3. Add automatic ALTER TABLE to main.py
with open('platform/main.py', 'r', encoding='utf-8') as f:
    main_content = f.read()

alter_sql = """        # Add gender column safely
        try:
            from sqlalchemy import text
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE hs_students ADD COLUMN gender VARCHAR(10) DEFAULT 'unspecified'"))
                conn.commit()
        except Exception:
            pass
        
        # Seed Homeschool grades"""
main_content = main_content.replace('# Seed Homeschool grades', alter_sql)

with open('platform/main.py', 'w', encoding='utf-8') as f:
    f.write(main_content)
