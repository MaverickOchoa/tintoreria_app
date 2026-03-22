from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, date

from core.database import get_db
from core.dependencies import get_current_claims, require_business_admin
from core.models.client import Client
from verticals.clinic.models import Patient, Appointment, ClinicalRecord, ClinicService, AppointmentStatus
from verticals.clinic.schemas import (
    PatientCreate, PatientUpdate,
    ClinicServiceCreate, ClinicServiceUpdate,
    AppointmentCreate, AppointmentUpdate,
    ClinicalRecordCreate, ClinicalRecordUpdate,
)

router = APIRouter(prefix="/clinic", tags=["clinic"])


@router.get("/patients")
def list_patients(
    search: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    business_id = claims.get("business_id")
    from core.models.tenant import Branch
    branch_ids = [b.id for b in db.query(Branch).filter_by(business_id=business_id).all()]
    q = db.query(Patient).join(Patient.client).filter(Client.branch_id.in_(branch_ids))
    if search:
        q = q.filter(
            Client.phone.contains(search) | Client.full_name.ilike(f"%{search}%")
        )
    total = q.count()
    patients = q.offset(offset).limit(limit).all()
    return {"total": total, "patients": [p.to_dict() for p in patients]}


@router.post("/patients", status_code=201)
def create_patient(
    payload: PatientCreate,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.id == payload.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado.")
    existing = db.query(Patient).filter(Patient.client_id == payload.client_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Este cliente ya tiene perfil de paciente.")
    patient = Patient(**payload.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient.to_dict()


@router.get("/patients/{patient_id}")
def get_patient(patient_id: int, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado.")
    return patient.to_dict()


@router.put("/patients/{patient_id}")
def update_patient(
    patient_id: int,
    payload: PatientUpdate,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado.")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(patient, field, value)
    db.commit()
    return patient.to_dict()


@router.get("/services")
def list_clinic_services(
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    business_id = claims.get("business_id")
    services = db.query(ClinicService).filter_by(business_id=business_id, is_active=True).all()
    return [s.to_dict() for s in services]


@router.post("/services", status_code=201)
def create_clinic_service(
    payload: ClinicServiceCreate,
    claims: dict = Depends(require_business_admin),
    db: Session = Depends(get_db),
):
    business_id = claims["business_id"]
    service = ClinicService(business_id=business_id, **payload.model_dump())
    db.add(service)
    db.commit()
    db.refresh(service)
    return service.to_dict()


@router.put("/services/{service_id}")
def update_clinic_service(
    service_id: int,
    payload: ClinicServiceUpdate,
    claims: dict = Depends(require_business_admin),
    db: Session = Depends(get_db),
):
    service = db.query(ClinicService).filter(
        ClinicService.id == service_id,
        ClinicService.business_id == claims["business_id"],
    ).first()
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado.")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(service, field, value)
    db.commit()
    return service.to_dict()


@router.get("/appointments")
def list_appointments(
    branch_id: Optional[int] = None,
    doctor_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    status: Optional[str] = None,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    business_id = claims.get("business_id")
    q = db.query(Appointment).filter(Appointment.business_id == business_id)
    if branch_id:
        q = q.filter(Appointment.branch_id == branch_id)
    elif claims.get("branch_id"):
        q = q.filter(Appointment.branch_id == claims["branch_id"])
    if doctor_id:
        q = q.filter(Appointment.doctor_id == doctor_id)
    if date_from:
        q = q.filter(Appointment.scheduled_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        q = q.filter(Appointment.scheduled_at <= datetime.combine(date_to, datetime.max.time()))
    if status:
        q = q.filter(Appointment.status == status)
    appointments = q.order_by(Appointment.scheduled_at.asc()).all()
    return {"appointments": [a.to_dict() for a in appointments]}


@router.post("/appointments", status_code=201)
def create_appointment(
    payload: AppointmentCreate,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    business_id = claims.get("business_id")
    appointment = Appointment(
        business_id=business_id,
        branch_id=payload.branch_id,
        patient_id=payload.patient_id,
        doctor_id=payload.doctor_id,
        clinic_service_id=payload.clinic_service_id,
        scheduled_at=payload.scheduled_at,
        duration_minutes=payload.duration_minutes,
        reason=payload.reason,
        notes=payload.notes,
        created_by=claims.get("sub"),
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment.to_dict()


@router.put("/appointments/{appointment_id}")
def update_appointment(
    appointment_id: int,
    payload: AppointmentUpdate,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    apt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.business_id == claims.get("business_id"),
    ).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Cita no encontrada.")
    update_data = payload.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(apt, field, value)
    if payload.status == AppointmentStatus.completed:
        apt.completed_at = datetime.utcnow()
    db.commit()
    return apt.to_dict()


@router.delete("/appointments/{appointment_id}", status_code=204)
def cancel_appointment(
    appointment_id: int,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    apt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.business_id == claims.get("business_id"),
    ).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Cita no encontrada.")
    apt.status = AppointmentStatus.cancelled
    db.commit()


@router.get("/patients/{patient_id}/records")
def get_patient_records(
    patient_id: int,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    records = db.query(ClinicalRecord).filter(
        ClinicalRecord.patient_id == patient_id,
        ClinicalRecord.business_id == claims.get("business_id"),
    ).order_by(ClinicalRecord.record_date.desc()).all()
    return {"records": [r.to_dict() for r in records]}


@router.post("/records", status_code=201)
def create_clinical_record(
    payload: ClinicalRecordCreate,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    business_id = claims.get("business_id")
    record = ClinicalRecord(
        business_id=business_id,
        created_by=claims.get("sub"),
        **payload.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record.to_dict()


@router.put("/records/{record_id}")
def update_clinical_record(
    record_id: int,
    payload: ClinicalRecordUpdate,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    record = db.query(ClinicalRecord).filter(
        ClinicalRecord.id == record_id,
        ClinicalRecord.business_id == claims.get("business_id"),
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(record, field, value)
    db.commit()
    return record.to_dict()


@router.get("/calendar")
def get_calendar(
    branch_id: Optional[int] = None,
    doctor_id: Optional[int] = None,
    view_date: Optional[date] = None,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    business_id = claims.get("business_id")
    target_date = view_date or date.today()
    week_start = target_date
    week_end = datetime.combine(target_date.replace(day=target_date.day + 6), datetime.max.time())
    q = db.query(Appointment).filter(
        Appointment.business_id == business_id,
        Appointment.scheduled_at >= datetime.combine(week_start, datetime.min.time()),
        Appointment.scheduled_at <= week_end,
        Appointment.status.notin_([AppointmentStatus.cancelled]),
    )
    if branch_id:
        q = q.filter(Appointment.branch_id == branch_id)
    if doctor_id:
        q = q.filter(Appointment.doctor_id == doctor_id)
    appointments = q.order_by(Appointment.scheduled_at.asc()).all()
    return {"appointments": [a.to_dict() for a in appointments]}
