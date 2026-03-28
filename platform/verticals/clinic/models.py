from sqlalchemy import Column, Integer, String, Boolean, Float, Text, ForeignKey, DateTime, Date, UniqueConstraint, Enum, Index
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
    client_id = Column(Integer, ForeignKey("clients.id"), unique=True, nullable=False, index=True)
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


class BranchSchedule(Base):
    """Clinic operating hours per branch, per day of the week."""
    __tablename__ = "clinic_branch_schedules"
    __table_args__ = (UniqueConstraint("branch_id", "day_of_week", name="uq_branch_day"),)

    id = Column(Integer, primary_key=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)   # 0=Mon … 6=Sun
    is_open = Column(Boolean, nullable=False, default=True)
    open_time = Column(String(5), nullable=False, default="09:00")
    close_time = Column(String(5), nullable=False, default="18:00")

    def to_dict(self) -> dict:
        return {
            "id": self.id, "branch_id": self.branch_id,
            "day": self.day_of_week, "active": self.is_open,
            "open": self.open_time, "close": self.close_time,
        }


class BranchMessage(Base):
    """Automated message templates per branch (WhatsApp / Email)."""
    __tablename__ = "clinic_branch_messages"
    __table_args__ = (UniqueConstraint("branch_id", "trigger_key", "channel", name="uq_branch_msg"),)

    id = Column(Integer, primary_key=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    trigger_key = Column(String(60), nullable=False)   # e.g. "new_patient"
    channel = Column(String(20), nullable=False)        # "whatsapp" | "email"
    text = Column(Text, nullable=False, default="")

    def to_dict(self) -> dict:
        return {
            "id": self.id, "branch_id": self.branch_id,
            "trigger_key": self.trigger_key, "channel": self.channel,
            "text": self.text,
        }


class ClinicPromotion(Base):
    """Promotions / discounts per branch."""
    __tablename__ = "clinic_promotions"

    id = Column(Integer, primary_key=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    name = Column(String(120), nullable=False)
    description = Column(Text, nullable=True)
    discount_pct = Column(Float, nullable=False, default=0)
    min_orders = Column(Integer, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id, "branch_id": self.branch_id,
            "name": self.name, "description": self.description,
            "discount_pct": self.discount_pct, "min_orders": self.min_orders,
            "is_active": self.is_active,
        }


class DoctorSchedule(Base):
    """Weekly availability per doctor per branch."""
    __tablename__ = "clinic_doctor_schedules"
    __table_args__ = (UniqueConstraint("doctor_id", "branch_id", "day_of_week", name="uq_doctor_day"),)

    id = Column(Integer, primary_key=True)
    doctor_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)   # 0=Mon … 6=Sun
    is_available = Column(Boolean, nullable=False, default=True)
    start_time = Column(String(5), nullable=False, default="09:00")
    end_time = Column(String(5), nullable=False, default="17:00")
    slot_duration_minutes = Column(Integer, nullable=False, default=30)

    doctor = relationship("Employee", foreign_keys=[doctor_id])

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "doctor_id": self.doctor_id,
            "doctor_name": self.doctor.full_name if self.doctor else None,
            "branch_id": self.branch_id,
            "day": self.day_of_week,
            "active": self.is_available,
            "start": self.start_time,
            "end": self.end_time,
            "slot_duration_minutes": self.slot_duration_minutes,
        }


class DoctorScheduleBlock(Base):
    """Blocked time slots for a doctor (vacation, break, personal)."""
    __tablename__ = "clinic_doctor_blocks"

    id = Column(Integer, primary_key=True)
    doctor_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    blocked_date = Column(Date, nullable=False, index=True)
    all_day = Column(Boolean, nullable=False, default=False)
    start_time = Column(String(5), nullable=True)
    end_time = Column(String(5), nullable=True)
    reason = Column(String(200), nullable=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id, "doctor_id": self.doctor_id, "branch_id": self.branch_id,
            "blocked_date": self.blocked_date.isoformat() if self.blocked_date else None,
            "all_day": self.all_day,
            "start_time": self.start_time, "end_time": self.end_time,
            "reason": self.reason,
        }


class ClinicService(Base):
    """Types of services a clinic offers: general, dental, chiro, physio, etc."""
    __tablename__ = "clinic_services"

    id = Column(Integer, primary_key=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False, index=True)
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
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("employees.id"), nullable=True, index=True)
    clinic_service_id = Column(Integer, ForeignKey("clinic_services.id"), nullable=True)
    scheduled_at = Column(DateTime, nullable=False, index=True)
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
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    doctor_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False, index=True)
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
