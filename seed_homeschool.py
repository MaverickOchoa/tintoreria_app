import sys
import os

# Setup django/fastapi env
sys.path.append(os.path.abspath('platform'))

from core.database import SessionLocal
from verticals.homeschool.models import HSGrade

db = SessionLocal()

grades_data = [
    (0, {"es": "K\u00ednder", "en": "Kindergarten"}),
    (1, {"es": "1\u00ba Primaria", "en": "1st Grade"}),
    (2, {"es": "2\u00ba Primaria", "en": "2nd Grade"}),
    (3, {"es": "3\u00ba Primaria", "en": "3rd Grade"}),
    (4, {"es": "4\u00ba Primaria", "en": "4th Grade"}),
    (5, {"es": "5\u00ba Primaria", "en": "5th Grade"}),
    (6, {"es": "6\u00ba Primaria", "en": "6th Grade"})
]

try:
    for order, name in grades_data:
        existing = db.query(HSGrade).filter(HSGrade.level_order == order).first()
        if not existing:
            g = HSGrade(level_order=order, name=name)
            db.add(g)
    db.commit()
    print("Grades seeded successfully")
except Exception as e:
    print(f"Error seeding grades: {e}")
finally:
    db.close()
