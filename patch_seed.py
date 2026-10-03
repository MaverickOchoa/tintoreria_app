import re

with open('platform/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = '''        Base.metadata.create_all(bind=engine)
        
        # Seed Homeschool grades
        with SessionLocal() as db:
            grades_data = [
                (0, {"es": "Kínder", "en": "Kindergarten"}),
                (1, {"es": "1º Primaria", "en": "1st Grade"}),
                (2, {"es": "2º Primaria", "en": "2nd Grade"}),
                (3, {"es": "3º Primaria", "en": "3rd Grade"}),
                (4, {"es": "4º Primaria", "en": "4th Grade"}),
                (5, {"es": "5º Primaria", "en": "5th Grade"}),
                (6, {"es": "6º Primaria", "en": "6th Grade"})
            ]
            for order, name in grades_data:
                existing = db.query(hs_models.HSGrade).filter(hs_models.HSGrade.level_order == order).first()
                if not existing:
                    db.add(hs_models.HSGrade(level_order=order, name=name))
            db.commit()'''

content = content.replace("        Base.metadata.create_all(bind=engine)", replacement)

with open('platform/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
