from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime

from core.database import get_db
from core.dependencies import get_current_claims
from verticals.homeschool.models import (
    HSGrade, HSSubject, HSDomain, HSObjective, 
    HSStudent, HSStudentMastery, MasteryStatus
)

router = APIRouter(prefix="/homeschool", tags=["homeschool"])

# --- SCHEMAS ---
class StudentCreate(BaseModel):
    first_name: str
    last_name: str
    grade_id: int
    date_of_birth: Optional[datetime] = None
    bilingual_preference: str = "es"

class MasteryUpdate(BaseModel):
    objective_id: int
    status: MasteryStatus
    progress_score: float = 0.0

# --- ROUTES ---

@router.get("/curriculum")
def get_curriculum(db: Session = Depends(get_db)):
    """Returns the base curriculum structure (Grades and Subjects)"""
    grades = db.query(HSGrade).order_by(HSGrade.level_order).all()
    subjects = db.query(HSSubject).all()
    
    return {
        "grades": [{"id": g.id, "level_order": g.level_order, "name": g.name} for g in grades],
        "subjects": [{"id": s.id, "name": s.name, "color_code": s.color_code} for s in subjects]
    }

@router.get("/students")
def get_students(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    """Get all students registered in the family (Business)"""
    business_id = claims.get("business_id")
    if not business_id:
        raise HTTPException(status_code=400, detail="Not associated with a family/business")
        
    students = db.query(HSStudent).filter(HSStudent.business_id == business_id).all()
    return [{"id": s.id, "first_name": s.first_name, "last_name": s.last_name, "grade_id": s.grade_id, "bilingual_preference": s.bilingual_preference, "gender": getattr(s, "gender", "unspecified")} for s in students]

@router.post("/students")
def create_student(data: StudentCreate, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    """Register a new student in the family"""
    business_id = claims.get("business_id")
    if not business_id:
        raise HTTPException(status_code=400, detail="Not associated with a family/business")
        
    student = HSStudent(
        business_id=business_id,
        first_name=data.first_name,
        last_name=data.last_name,
        grade_id=data.grade_id,
        date_of_birth=data.date_of_birth,
        bilingual_preference=data.bilingual_preference,
        gender=data.gender
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return {"id": student.id, "first_name": student.first_name, "last_name": student.last_name, "grade_id": student.grade_id, "bilingual_preference": student.bilingual_preference, "gender": getattr(student, "gender", "unspecified")}

@router.put("/students/{student_id}")
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

@router.post("/students/{student_id}/mastery")
def update_mastery(student_id: int, data: MasteryUpdate, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    """Update mastery from mini-games or parent manual check"""
    business_id = claims.get("business_id")
    
    # Verify student belongs to family
    student = db.query(HSStudent).filter(HSStudent.id == student_id, HSStudent.business_id == business_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found in this family")
        
    mastery = db.query(HSStudentMastery).filter(
        HSStudentMastery.student_id == student_id,
        HSStudentMastery.objective_id == data.objective_id
    ).first()
    
    if not mastery:
        mastery = HSStudentMastery(
            student_id=student_id,
            objective_id=data.objective_id,
            status=data.status,
            progress_score=data.progress_score,
            last_assessed_at=datetime.utcnow()
        )
        db.add(mastery)
    else:
        mastery.status = data.status
        mastery.progress_score = data.progress_score
        mastery.last_assessed_at = datetime.utcnow()
        
    db.commit()
    db.refresh(mastery)
    return {"id": mastery.id, "objective_id": mastery.objective_id, "status": mastery.status, "progress_score": mastery.progress_score}

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

@router.get("/debug-db")
def debug_db():
    try:
        from core.database import engine, Base
        from verticals.homeschool import models as hs_models
        Base.metadata.create_all(bind=engine)
        return {"status": "success", "message": "Tables created successfully"}
    except Exception as e:
        import traceback
        return {"status": "error", "error": str(e), "traceback": traceback.format_exc()}
