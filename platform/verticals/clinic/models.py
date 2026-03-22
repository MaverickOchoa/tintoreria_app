from sqlalchemy import Column, Integer, String, Boolean, Float, Text, ForeignKey, DateTime, Date, UniqueConstraint, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base
import enum


class AppointmentStatus(str, enum.Enum):
    scheduled = "Agendada"
    confirmed = "Confirmada"
    in_progress = "En Consulta"
    completed = "Completada"
    no_show = "No Show"
    cancelled = "Cancelada"


class Patient(Base):
    """Extends client profile with clinical data. One-to-one with clients."""
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), unique=True, nullable=False)
    blood_type = Column(String(10), nullable=True)
    allergies = Column(Text, nullable=True)
    emergency_contact_name = Column(String(150), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)
    occupation = Column(String(100), nullable=True)
    medical_history = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    client = relationship("Client", backref="patient_profile", uselist=False)
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
    clinical_records = relationship("ClinicalRecord", back_populates="patient", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        client_data = self.client.to_dict() if self.client else {}
        return {
            **client_data,
            "patient_id": self.id,
            "blood_type": self.blood_type,
            "allergies": self.allergies,
            "emergency_contact_name": self.emergency_contact_name,
            "emergency_contact_phone": self.emergency_contact_phone,
            "occupation": self.occupation,
            "medical_history": self.medical_history,
        }


class ClinicService(Base):
    """Types of services a clinic offers: general, dental, chiro, physio, etc."""
    __tablename__ = "clinic_services"

    id = Column(Integer, primary_key=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    duration_minutes = Column(Integer, nullable=False, default=30)
    price = Column(Float, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    appointments = relationship("Appointment", back_populates="clinic_service")

    def to_dict(self) -> dict:
        return {
            "id": self.id, "business_id": self.business_id,
            "name": self.name, "description": self.description,
            "duration_minutes": self.duration_minutes, "price": self.price,
            "is_active": self.is_active,
        }


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    clinic_service_id = Column(Integer, ForeignKey("clinic_services.id"), nullable=True)
    scheduled_at = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=30)
    status = Column(String(30), nullable=False, default=AppointmentStatus.scheduled)
    notes = Column(Text, nullable=True)
    reason = Column(String(255), nullable=True)
    created_by = Column(String(120), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Employee", backref="appointments")
    clinic_service = relationship("ClinicService", back_populates="appointments")
    clinical_records = relationship("ClinicalRecord", back_populates="appointment")

    def to_dict(self) -> dict:
        return {
            "id": self.id, "business_id": self.business_id, "branch_id": self.branch_id,
            "patient_id": self.patient_id,
            "patient_name": (
                (self.patient.client.full_name + " " + (self.patient.client.last_name or "")).strip()
                if self.patient and self.patient.client else None
            ),
            "doctor_id": self.doctor_id,
            "doctor_name": self.doctor.full_name if self.doctor else None,
            "clinic_service_id": self.clinic_service_id,
            "service_name": self.clinic_service.name if self.clinic_service else None,
            "scheduled_at": self.scheduled_at.isoformat() if self.scheduled_at else None,
            "duration_minutes": self.duration_minutes,
            "status": self.status, "notes": self.notes, "reason": self.reason,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class ClinicalRecord(Base):
    __tablename__ = "clinical_records"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    doctor_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)

    chief_complaint = Column(Text, nullable=True)
    diagnosis = Column(Text, nullable=True)
    treatment = Column(Text, nullable=True)
    prescription = Column(Text, nullable=True)
    next_appointment_notes = Column(Text, nullable=True)
    vital_signs = Column(Text, nullable=True)
    record_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(String(120), nullable=True)

    patient = relationship("Patient", back_populates="clinical_records")
    appointment = relationship("Appointment", back_populates="clinical_records")
    doctor = relationship("Employee", backref="clinical_records")

    def to_dict(self) -> dict:
        return {
            "id": self.id, "patient_id": self.patient_id, "appointment_id": self.appointment_id,
            "doctor_id": self.doctor_id,
            "doctor_name": self.doctor.full_name if self.doctor else None,
            "business_id": self.business_id, "branch_id": self.branch_id,
            "chief_complaint": self.chief_complaint, "diagnosis": self.diagnosis,
            "treatment": self.treatment, "prescription": self.prescription,
            "next_appointment_notes": self.next_appointment_notes,
            "vital_signs": self.vital_signs,
            "record_date": self.record_date.isoformat() if self.record_date else None,
            "created_by": self.created_by,
        }
