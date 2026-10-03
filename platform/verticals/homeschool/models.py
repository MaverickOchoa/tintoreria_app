from sqlalchemy import Column, Integer, String, ForeignKey, Float, DateTime, Enum, JSON, Table
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from core.database import Base

class MasteryStatus(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    PRACTICE_NEEDED = "PRACTICE_NEEDED"
    MASTERED = "MASTERED"
    REVIEW = "REVIEW"
    STRUGGLING = "STRUGGLING"

class PriorityLevel(str, enum.Enum):
    A = "CORE"         # Indispensables
    B = "FUNDAMENTAL"  # Fundamentales
    C = "DEVELOPMENT"  # Desarrollo

# Many-to-Many association for prerequisites
hs_objective_prerequisites = Table(
    'hs_objective_prerequisites', Base.metadata,
    Column('objective_id', Integer, ForeignKey('hs_objectives.id'), primary_key=True),
    Column('prerequisite_id', Integer, ForeignKey('hs_objectives.id'), primary_key=True)
)

class HSGrade(Base):
    """
    Grades K-12
    """
    __tablename__ = 'hs_grades'
    id = Column(Integer, primary_key=True, index=True)
    level_order = Column(Integer, unique=True, index=True) # 0 for K, 1 for 1st, etc.
    
    # Bilingual support (e.g., {"es": "1º Primaria", "en": "1st Grade"})
    name = Column(JSON) 
    
    students = relationship("HSStudent", back_populates="grade")


class HSSubject(Base):
    """
    Core Pillars (Language, Math, Science, etc.)
    """
    __tablename__ = 'hs_subjects'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(JSON) # {"es": "Matemáticas", "en": "Math"}
    color_code = Column(String)
    
    domains = relationship("HSDomain", back_populates="subject")


class HSDomain(Base):
    """
    Grouping within a subject (e.g., "Number Sense" in Math)
    """
    __tablename__ = 'hs_domains'
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey('hs_subjects.id'))
    name = Column(JSON)
    
    subject = relationship("HSSubject", back_populates="domains")
    objectives = relationship("HSObjective", back_populates="domain")


class HSObjective(Base):
    """
    The core of the mastery system. Specific, observable, and connected.
    """
    __tablename__ = 'hs_objectives'
    id = Column(Integer, primary_key=True, index=True)
    domain_id = Column(Integer, ForeignKey('hs_domains.id'))
    grade_id = Column(Integer, ForeignKey('hs_grades.id'))
    
    title = Column(JSON) # {"es": "Suma de tres cifras", "en": "Three-digit addition"}
    description = Column(JSON)
    
    priority = Column(Enum(PriorityLevel), default=PriorityLevel.B)
    mastery_threshold = Column(Float, default=0.8) # 80% default threshold
    
    # Reference mappings to external curriculums (SEP, Common Core)
    curriculum_references = Column(JSON, default=dict) 
    
    domain = relationship("HSDomain", back_populates="objectives")
    grade = relationship("HSGrade")
    
    # Self-referential Many-to-Many for prerequisites
    prerequisites = relationship(
        "HSObjective",
        secondary=hs_objective_prerequisites,
        primaryjoin=id==hs_objective_prerequisites.c.objective_id,
        secondaryjoin=id==hs_objective_prerequisites.c.prerequisite_id,
        backref="is_prerequisite_for"
    )


class HSStudent(Base):
    """
    The student assigned to a specific Homeschool Family (Business).
    """
    __tablename__ = 'hs_students'
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey('businesses.id')) # The Family Tenant
    grade_id = Column(Integer, ForeignKey('hs_grades.id'))
    
    first_name = Column(String)
    last_name = Column(String)
    date_of_birth = Column(DateTime)
    
    # Controls which language the curriculum displays for this student
    bilingual_preference = Column(String, default="es") # 'es', 'en', or 'bilingual'
    
    grade = relationship("HSGrade", back_populates="students")
    mastery_records = relationship("HSStudentMastery", back_populates="student")


class HSStudentMastery(Base):
    """
    Tracking progress and mastery of each objective for a specific student.
    Handles Spaced Repetition (next_review_at).
    """
    __tablename__ = 'hs_student_mastery'
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('hs_students.id'))
    objective_id = Column(Integer, ForeignKey('hs_objectives.id'))
    
    status = Column(Enum(MasteryStatus), default=MasteryStatus.NOT_STARTED)
    progress_score = Column(Float, default=0.0) # E.g., 0.85 for 85%
    
    last_assessed_at = Column(DateTime, nullable=True)
    next_review_at = Column(DateTime, nullable=True) # Used by Adaptive Engine for spaced repetition
    
    student = relationship("HSStudent", back_populates="mastery_records")
    objective = relationship("HSObjective")
