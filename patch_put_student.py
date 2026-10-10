import re

with open('platform/verticals/homeschool/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

put_route = """@router.put("/students/{student_id}")
def update_student(student_id: int, data: StudentCreate, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    business_id = claims.get("business_id")
    student = db.query(HSStudent).filter(HSStudent.id == student_id, HSStudent.business_id == business_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    student.first_name = data.first_name
    student.last_name = data.last_name
    student.grade_id = data.grade_id
    if data.date_of_birth:
        from datetime import datetime
        try:
            student.date_of_birth = datetime.strptime(data.date_of_birth, "%Y-%m-%d")
        except:
            pass
    student.bilingual_preference = data.bilingual_preference
    student.gender = data.gender
    
    db.commit()
    db.refresh(student)
    return {"id": student.id, "first_name": student.first_name, "last_name": student.last_name, "grade_id": student.grade_id, "bilingual_preference": student.bilingual_preference, "gender": getattr(student, "gender", "unspecified")}

@router.post("/students/{student_id}/mastery")"""

content = content.replace('@router.post("/students/{student_id}/mastery")', put_route)

with open('platform/verticals/homeschool/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
