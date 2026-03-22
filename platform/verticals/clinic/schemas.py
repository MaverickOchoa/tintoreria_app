from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class PatientCreate(BaseModel):
    client_id: int
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    occupation: Optional[str] = None
    medical_history: Optional[str] = None


class PatientCreateFull(BaseModel):
    full_name: str
    last_name: Optional[str] = None
    phone: str
    email: Optional[str] = None
    birth_date: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    notes: Optional[str] = None
    branch_id: Optional[int] = None
    business_id: Optional[int] = None


class PatientUpdate(BaseModel):
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    occupation: Optional[str] = None
    medical_history: Optional[str] = None


class ClinicServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    duration_minutes: int = 30
    price: Optional[float] = None


class ClinicServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    price: Optional[float] = None
    is_active: Optional[bool] = None


class AppointmentCreate(BaseModel):
    branch_id: int
    patient_id: int
    doctor_id: Optional[int] = None
    clinic_service_id: Optional[int] = None
    scheduled_at: datetime
    duration_minutes: int = 30
    reason: Optional[str] = None
    notes: Optional[str] = None


class AppointmentUpdate(BaseModel):
    doctor_id: Optional[int] = None
    clinic_service_id: Optional[int] = None
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    status: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None


class ClinicalRecordCreate(BaseModel):
    patient_id: int
    branch_id: int
    appointment_id: Optional[int] = None
    doctor_id: Optional[int] = None
    chief_complaint: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment: Optional[str] = None
    prescription: Optional[str] = None
    next_appointment_notes: Optional[str] = None
    vital_signs: Optional[str] = None


class ClinicalRecordUpdate(BaseModel):
    chief_complaint: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment: Optional[str] = None
    prescription: Optional[str] = None
    next_appointment_notes: Optional[str] = None
    vital_signs: Optional[str] = None
