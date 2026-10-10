import re

with open('platform/verticals/homeschool/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

seed_endpoint = '''
@router.post("/seed-curriculum")
def seed_curriculum(db: Session = Depends(get_db)):
    grades_data = [
        (0, {"es": "Kínder", "en": "Kindergarten"}),
        (1, {"es": "1º Primaria", "en": "1st Grade"}),
        (2, {"es": "2º Primaria", "en": "2nd Grade"}),
        (3, {"es": "3º Primaria", "en": "3rd Grade"}),
        (4, {"es": "4º Primaria", "en": "4th Grade"}),
        (5, {"es": "5º Primaria", "en": "5th Grade"}),
        (6, {"es": "6º Primaria", "en": "6th Grade"})
    ]
    added = 0
    for order, name in grades_data:
        existing = db.query(HSGrade).filter(HSGrade.level_order == order).first()
        if not existing:
            db.add(HSGrade(level_order=order, name=name))
            added += 1
    db.commit()
    return {"message": f"Seeded {added} grades."}
'''

content += seed_endpoint

with open('platform/verticals/homeschool/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
