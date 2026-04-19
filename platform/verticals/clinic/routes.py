from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from datetime import datetime, date, timedelta
import secrets, string, os, logging

import sendgrid as sg_module
from sendgrid.helpers.mail import Mail
from werkzeug.security import generate_password_hash, check_password_hash
from jose import jwt

logger = logging.getLogger(__name__)

from core.database import get_db
from core.dependencies import get_current_claims, require_business_admin
from core.models.client import Client
from verticals.clinic.models import (
    Patient, Appointment, ClinicalRecord, ClinicService, AppointmentStatus,
    BranchSchedule, BranchMessage, ClinicPromotion,
    DoctorSchedule, DoctorScheduleBlock, ClinicalFormEntry,
)
from verticals.clinic.schemas import (
    PatientCreate, PatientCreateFull, PatientUpdate,
    ClinicServiceCreate, ClinicServiceUpdate,
    AppointmentCreate, AppointmentUpdate,
    ClinicalRecordCreate, ClinicalRecordUpdate,
)

router = APIRouter(prefix="/clinic", tags=["clinic"])

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "supersecretkey")
ALGORITHM = "HS256"
SENDGRID_KEY = os.getenv("SENDGRID_API_KEY", "")
SENDER_EMAIL = os.getenv("SENDGRID_FROM_EMAIL", "huttmanochoa@gmail.com")
PORTAL_URL = os.getenv("PATIENT_PORTAL_URL", "https://zentro.onrender.com/patient/login")


def _send_patient_credentials(email: str, full_name: str, username: str, password: str) -> bool:
    sendgrid_key  = os.getenv("SENDGRID_API_KEY", "")
    sender_email  = os.getenv("SENDGRID_FROM_EMAIL", "huttmanochoa@gmail.com")
    portal_url    = os.getenv("PATIENT_PORTAL_URL", "https://zentro.onrender.com/patient/login")
    if not sendgrid_key or not email:
        logger.warning("Email not sent: SENDGRID_API_KEY missing or no email. Key set: %s", bool(sendgrid_key))
        return False
    try:
        sg = sg_module.SendGridAPIClient(sendgrid_key)
        message = Mail(
            from_email=sender_email,
            to_emails=email,
            subject="Bienvenido a Zentro Clinic — Tus credenciales de acceso",
            html_content=f"""
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;background:#f8f9fa;border-radius:12px">
              <h2 style="color:#4361ee;margin-bottom:4px">Zentro Clinic</h2>
              <p style="color:#555">Hola <strong>{full_name}</strong>, tu perfil ha sido creado.</p>
              <div style="background:#fff;border-radius:8px;padding:20px;margin:20px 0;border:1px solid #e0e0e0">
                <p style="margin:0 0 8px;color:#333;font-size:15px"><strong>Tus datos de acceso al portal:</strong></p>
                <p style="margin:4px 0;color:#555">Usuario: <strong>{username}</strong></p>
                <p style="margin:4px 0;color:#555">Contraseña temporal: <strong>{password}</strong></p>
                <p style="margin:12px 0 0;color:#888;font-size:12px">Tu contraseña temporal es tu número de teléfono. Te recomendamos cambiarla después de tu primer acceso.</p>
              </div>
              <a href="{portal_url}" style="display:inline-block;background:#4361ee;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700">Acceder a mi portal</a>
              <p style="color:#aaa;font-size:12px;margin-top:24px">Zentro Clinic · Powered by Zentro</p>
            </div>
            """
        )
        response = sg.send(message)
        logger.info(f"Email sent to {email}, status={response.status_code}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {email}: {e}", exc_info=True)
        return False


def _generate_username(full_name: str, last_name: str, db: Session) -> str:
    import unicodedata, re
    def slugify(s):
        s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
        return re.sub(r"[^a-z0-9]", "", s.lower())
    name = slugify(full_name or "")
    last = slugify(last_name or "")
    base = f"{name}.{last}" if last else name
    candidate = base
    counter = 1
    while db.query(Client).filter(Client.username == candidate).first():
        candidate = f"{base}{counter}"
        counter += 1
    return candidate


# ── Patients ──────────────────────────────────────────────────────────────────

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
    q = (
        db.query(Patient)
        .join(Patient.client)
        .options(joinedload(Patient.client))
        .filter(
            (Client.branch_id.in_(branch_ids)) | (Client.branch_id.is_(None))
        )
    )
    if search:
        q = q.filter(Client.phone.contains(search) | Client.full_name.ilike(f"%{search}%"))
    total = q.count()
    patients = q.offset(offset).limit(limit).all()
    return {"total": total, "patients": [p.to_dict() for p in patients]}


@router.post("/patients", status_code=201)
def create_patient(
    payload: PatientCreateFull,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    business_id = claims.get("business_id")
    branch_id = payload.branch_id or claims.get("branch_id") or None

    # Check phone uniqueness
    existing_client = db.query(Client).filter(Client.phone == payload.phone).first()
    if existing_client:
        existing_patient = db.query(Patient).filter(Patient.client_id == existing_client.id).first()
        if existing_patient:
            raise HTTPException(status_code=409, detail="Ya existe un paciente con ese teléfono.")

    # Generate credentials — username=nombre.apellido, password=phone
    username = _generate_username(payload.full_name, payload.last_name or "", db)
    raw_password = payload.phone  # temp password = phone number

    # Create client record
    client = Client(
        full_name=payload.full_name.strip().capitalize() if payload.full_name else payload.full_name,
        last_name=payload.last_name.strip().capitalize() if payload.last_name else payload.last_name,
        phone=payload.phone,
        email=payload.email,
        notes=payload.notes,
        branch_id=branch_id,
        username=username,
        password=generate_password_hash(raw_password),
        consent_whatsapp=payload.consent_whatsapp,
        consent_email=payload.consent_email,
    )
    if payload.birth_date:
        try:
            dt = datetime.strptime(payload.birth_date, "%Y-%m-%d")
            client.date_of_birth_day = dt.day
            client.date_of_birth_month = dt.month
        except Exception:
            pass
    db.add(client)
    db.flush()

    # Create patient profile
    patient = Patient(
        client_id=client.id,
        gender=payload.gender,
        marital_status=payload.marital_status,
        blood_type=payload.blood_type,
        allergies=payload.allergies,
        app_history=payload.app_history,
        current_medications=payload.current_medications,
        weight_kg=payload.weight_kg,
        height_cm=payload.height_cm,
        medical_diagnosis=payload.medical_diagnosis,
        specialist_diagnosis=payload.specialist_diagnosis,
        chief_complaint=payload.chief_complaint,
        emergency_contact_name=payload.emergency_contact_name,
        emergency_contact_phone=payload.emergency_contact_phone,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    # Send credentials — always send if email provided, regardless of consent_email
    email_sent = False
    if payload.email:
        email_sent = _send_patient_credentials(
            payload.email,
            f"{payload.full_name} {payload.last_name or ''}".strip(),
            username,
            raw_password,
        )
    elif not payload.email:
        logger.warning("Patient created without email — credentials not sent for user %s", username)

    result = patient.to_dict()
    result["email_sent"] = email_sent
    return result


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


@router.delete("/patients/{patient_id}", status_code=204)
def delete_patient(
    patient_id: int,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado.")
    client = db.query(Client).filter(Client.id == patient.client_id).first()
    db.delete(patient)
    if client:
        db.delete(client)
    db.commit()
    return


# ── Patient Portal Auth ────────────────────────────────────────────────────────

@router.post("/patient/login")
def patient_login(
    payload: dict,
    db: Session = Depends(get_db),
):
    username = payload.get("username", "").strip()
    password = payload.get("password", "")
    if not username or not password:
        raise HTTPException(status_code=400, detail="Usuario y contraseña requeridos.")
    client = db.query(Client).filter(Client.username == username).first()
    if not client or not client.password:
        raise HTTPException(status_code=401, detail="Credenciales inválidas.")
    if not check_password_hash(client.password, password):
        raise HTTPException(status_code=401, detail="Credenciales inválidas.")
    patient = db.query(Patient).filter(Patient.client_id == client.id).first()
    if not patient:
        raise HTTPException(status_code=403, detail="Este usuario no tiene perfil de paciente.")
    token_data = {
        "sub": str(client.id),
        "role": "patient",
        "patient_id": patient.id,
        "client_id": client.id,
        "full_name": f"{client.full_name} {client.last_name or ''}".strip(),
        "email": client.email,
    }
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer", "patient": token_data}


def get_patient_claims(db: Session = Depends(get_db), claims: dict = Depends(get_current_claims)):
    if claims.get("role") != "patient":
        raise HTTPException(status_code=403, detail="Acceso solo para pacientes.")
    return claims


# ── Patient Portal Endpoints ───────────────────────────────────────────────────

@router.get("/portal/me")
def portal_me(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    if claims.get("role") != "patient":
        raise HTTPException(status_code=403, detail="Acceso solo para pacientes.")
    patient = db.query(Patient).filter(Patient.id == claims.get("patient_id")).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado.")
    return patient.to_dict()


@router.get("/portal/appointments")
def portal_appointments(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    if claims.get("role") != "patient":
        raise HTTPException(status_code=403, detail="Acceso solo para pacientes.")
    apts = db.query(Appointment).filter(
        Appointment.patient_id == claims.get("patient_id")
    ).order_by(Appointment.scheduled_at.desc()).all()
    return {"appointments": [a.to_dict() for a in apts]}


@router.get("/portal/records")
def portal_records(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    if claims.get("role") != "patient":
        raise HTTPException(status_code=403, detail="Acceso solo para pacientes.")
    records = db.query(ClinicalRecord).filter(
        ClinicalRecord.patient_id == claims.get("patient_id")
    ).order_by(ClinicalRecord.record_date.desc()).all()
    return {"records": [r.to_dict() for r in records]}


@router.get("/portal/form-entries")
def portal_form_entries(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    """Returns finalized clinical form entries visible to the patient."""
    if claims.get("role") != "patient":
        raise HTTPException(status_code=403, detail="Acceso solo para pacientes.")
    import json as _json
    entries = (
        db.query(ClinicalFormEntry)
        .filter(
            ClinicalFormEntry.patient_id == claims.get("patient_id"),
            ClinicalFormEntry.status == "final",
        )
        .order_by(ClinicalFormEntry.created_at.desc())
        .all()
    )
    return {"entries": [e.to_dict() for e in entries]}


@router.get("/portal/form-entries/{entry_id}")
def portal_form_entry_detail(
    entry_id: int,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    """Returns a single finalized form entry for the authenticated patient."""
    if claims.get("role") != "patient":
        raise HTTPException(status_code=403, detail="Acceso solo para pacientes.")
    entry = db.query(ClinicalFormEntry).filter_by(id=entry_id, status="final").first()
    if not entry:
        raise HTTPException(status_code=404, detail="Hoja no encontrada.")
    if entry.patient_id != claims.get("patient_id"):
        raise HTTPException(status_code=403, detail="Sin acceso a esta hoja.")
    return entry.to_dict()


@router.get("/portal/payments")
def portal_payments(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    if claims.get("role") != "patient":
        raise HTTPException(status_code=403, detail="Acceso solo para pacientes.")
    apts = (
        db.query(Appointment)
        .options(joinedload(Appointment.clinic_service))
        .filter(
            Appointment.patient_id == claims.get("patient_id"),
            Appointment.status == AppointmentStatus.completed,
        )
        .order_by(Appointment.scheduled_at.desc())
        .all()
    )
    payments = []
    for a in apts:
        service = a.clinic_service
        payments.append({
            "appointment_id": a.id,
            "date": a.scheduled_at.isoformat() if a.scheduled_at else None,
            "service": service.name if service else "Consulta",
            "amount": service.price if service else 0,
            "paid": False,
        })
    return {"payments": payments}


# ── Services ───────────────────────────────────────────────────────────────────

@router.get("/services")
def list_clinic_services(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
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


# ── Appointments ───────────────────────────────────────────────────────────────

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
    q = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient).joinedload(Patient.client),
            joinedload(Appointment.doctor),
            joinedload(Appointment.clinic_service),
        )
        .filter(Appointment.business_id == business_id)
    )
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
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(apt, field, value)
    try:
        resolved_status = AppointmentStatus(apt.status)
    except ValueError:
        resolved_status = None
    if resolved_status == AppointmentStatus.completed and not apt.completed_at:
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


# ── Clinical Records ───────────────────────────────────────────────────────────

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
    record = ClinicalRecord(business_id=business_id, created_by=claims.get("sub"), **payload.model_dump())
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


# ── Calendar ───────────────────────────────────────────────────────────────────

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
    week_start = datetime.combine(target_date, datetime.min.time())
    week_end = datetime.combine(target_date + timedelta(days=6), datetime.max.time())
    q = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient).joinedload(Patient.client),
            joinedload(Appointment.doctor),
            joinedload(Appointment.clinic_service),
        )
        .filter(
            Appointment.business_id == business_id,
            Appointment.scheduled_at >= week_start,
            Appointment.scheduled_at <= week_end,
            Appointment.status.notin_([AppointmentStatus.cancelled]),
        )
    )
    if branch_id:
        q = q.filter(Appointment.branch_id == branch_id)
    if doctor_id:
        q = q.filter(Appointment.doctor_id == doctor_id)
    appointments = q.order_by(Appointment.scheduled_at.asc()).all()
    return {"appointments": [a.to_dict() for a in appointments]}


# ── Branch Schedule ────────────────────────────────────────────────────────────

DAYS_DEFAULT = [
    {"day": 0, "label": "Lunes",     "active": True,  "open": "09:00", "close": "18:00"},
    {"day": 1, "label": "Martes",    "active": True,  "open": "09:00", "close": "18:00"},
    {"day": 2, "label": "Miércoles", "active": True,  "open": "09:00", "close": "18:00"},
    {"day": 3, "label": "Jueves",    "active": True,  "open": "09:00", "close": "18:00"},
    {"day": 4, "label": "Viernes",   "active": True,  "open": "09:00", "close": "18:00"},
    {"day": 5, "label": "Sábado",    "active": False, "open": "09:00", "close": "14:00"},
    {"day": 6, "label": "Domingo",   "active": False, "open": "09:00", "close": "14:00"},
]

DAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]


@router.get("/schedule")
def get_branch_schedule(
    branch_id: int = Query(...),
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    rows = db.query(BranchSchedule).filter_by(branch_id=branch_id).order_by(BranchSchedule.day_of_week).all()
    if not rows:
        return DAYS_DEFAULT
    result = {r.day_of_week: r for r in rows}
    return [
        {
            "day": d,
            "label": DAY_LABELS[d],
            "active": result[d].is_open if d in result else d < 5,
            "open": result[d].open_time if d in result else "09:00",
            "close": result[d].close_time if d in result else "18:00",
        }
        for d in range(7)
    ]


@router.post("/schedule", status_code=200)
def save_branch_schedule(
    payload: dict,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    branch_id = payload.get("branch_id")
    schedule = payload.get("schedule", [])
    business_id = claims.get("business_id")
    if not branch_id:
        raise HTTPException(status_code=400, detail="branch_id requerido.")
    for entry in schedule:
        day = entry.get("day")
        row = db.query(BranchSchedule).filter_by(branch_id=branch_id, day_of_week=day).first()
        if row:
            row.is_open = entry.get("active", True)
            row.open_time = entry.get("open", "09:00")
            row.close_time = entry.get("close", "18:00")
        else:
            db.add(BranchSchedule(
                branch_id=branch_id, business_id=business_id, day_of_week=day,
                is_open=entry.get("active", True),
                open_time=entry.get("open", "09:00"),
                close_time=entry.get("close", "18:00"),
            ))
    db.commit()
    return {"ok": True}


# ── Branch Messages ────────────────────────────────────────────────────────────

@router.get("/messages")
def get_branch_messages(
    branch_id: int = Query(...),
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    rows = db.query(BranchMessage).filter_by(branch_id=branch_id).all()
    return {f"{r.trigger_key}_{r.channel}": r.text for r in rows}


@router.post("/messages", status_code=200)
def save_branch_messages(
    payload: dict,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    branch_id = payload.get("branch_id")
    messages: dict = payload.get("messages", {})
    business_id = claims.get("business_id")
    if not branch_id:
        raise HTTPException(status_code=400, detail="branch_id requerido.")
    for composite_key, text in messages.items():
        parts = composite_key.rsplit("_", 1)
        if len(parts) != 2:
            continue
        trigger_key, channel = parts
        row = db.query(BranchMessage).filter_by(
            branch_id=branch_id, trigger_key=trigger_key, channel=channel
        ).first()
        if row:
            row.text = text
        else:
            db.add(BranchMessage(
                branch_id=branch_id, business_id=business_id,
                trigger_key=trigger_key, channel=channel, text=text,
            ))
    db.commit()
    return {"ok": True}


# ── Clinic Promotions ──────────────────────────────────────────────────────────

@router.get("/promotions")
def list_promotions(
    branch_id: int = Query(...),
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    promos = db.query(ClinicPromotion).filter_by(branch_id=branch_id, is_active=True).all()
    return [p.to_dict() for p in promos]


@router.post("/promotions", status_code=201)
def create_promotion(
    payload: dict,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    branch_id = payload.get("branch_id")
    if not branch_id or not payload.get("name"):
        raise HTTPException(status_code=400, detail="branch_id y name son requeridos.")
    promo = ClinicPromotion(
        branch_id=branch_id,
        business_id=claims.get("business_id"),
        name=payload["name"],
        description=payload.get("description"),
        discount_pct=float(payload.get("discount_pct", 0)),
        min_orders=payload.get("min_orders"),
    )
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return promo.to_dict()


@router.delete("/promotions/{promo_id}", status_code=204)
def delete_promotion(
    promo_id: int,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    promo = db.query(ClinicPromotion).filter_by(id=promo_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promoción no encontrada.")
    promo.is_active = False   # soft delete
    db.commit()
    return


# ── Doctor Schedule ────────────────────────────────────────────────────────────

@router.get("/doctors")
def list_doctors(
    branch_id: int = Query(...),
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    from core.models.user import Employee
    docs = db.query(Employee).filter_by(branch_id=branch_id, is_active=True).all()
    return [{"id": d.id, "full_name": d.full_name, "specialty": getattr(d, "specialty", None)} for d in docs]


@router.get("/doctors/{doctor_id}/schedule")
def get_doctor_schedule(
    doctor_id: int,
    branch_id: int = Query(...),
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    rows = db.query(DoctorSchedule).filter_by(
        doctor_id=doctor_id, branch_id=branch_id
    ).order_by(DoctorSchedule.day_of_week).all()
    if not rows:
        return [
            {"day": d, "label": DAY_LABELS[d], "active": d < 5,
             "start": "09:00", "end": "17:00", "slot_duration_minutes": 30}
            for d in range(7)
        ]
    result = {r.day_of_week: r for r in rows}
    return [
        {
            "day": d,
            "label": DAY_LABELS[d],
            "active": result[d].is_available if d in result else d < 5,
            "start": result[d].start_time if d in result else "09:00",
            "end": result[d].end_time if d in result else "17:00",
            "slot_duration_minutes": result[d].slot_duration_minutes if d in result else 30,
        }
        for d in range(7)
    ]


@router.post("/doctors/{doctor_id}/schedule", status_code=200)
def save_doctor_schedule(
    doctor_id: int,
    payload: dict,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    branch_id = payload.get("branch_id")
    schedule = payload.get("schedule", [])
    business_id = claims.get("business_id")
    if not branch_id:
        raise HTTPException(status_code=400, detail="branch_id requerido.")
    for entry in schedule:
        day = entry.get("day")
        row = db.query(DoctorSchedule).filter_by(
            doctor_id=doctor_id, branch_id=branch_id, day_of_week=day
        ).first()
        if row:
            row.is_available = entry.get("active", True)
            row.start_time = entry.get("start", "09:00")
            row.end_time = entry.get("end", "17:00")
            row.slot_duration_minutes = entry.get("slot_duration_minutes", 30)
        else:
            db.add(DoctorSchedule(
                doctor_id=doctor_id, branch_id=branch_id, business_id=business_id,
                day_of_week=day,
                is_available=entry.get("active", True),
                start_time=entry.get("start", "09:00"),
                end_time=entry.get("end", "17:00"),
                slot_duration_minutes=entry.get("slot_duration_minutes", 30),
            ))
    db.commit()
    return {"ok": True}


@router.get("/doctors/{doctor_id}/available-slots")
def get_available_slots(
    doctor_id: int,
    target_date: date = Query(..., alias="date"),
    branch_id: int = Query(...),
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    """Return list of available time slots for a doctor on a given date."""
    day_of_week = target_date.weekday()   # 0=Mon, 6=Sun

    sched = db.query(DoctorSchedule).filter_by(
        doctor_id=doctor_id, branch_id=branch_id, day_of_week=day_of_week
    ).first()
    if not sched or not sched.is_available:
        return {"slots": []}

    # Build all possible slots
    start_h, start_m = map(int, sched.start_time.split(":"))
    end_h, end_m = map(int, sched.end_time.split(":"))
    duration = sched.slot_duration_minutes

    from datetime import time as dt_time
    current = datetime.combine(target_date, dt_time(start_h, start_m))
    end_dt = datetime.combine(target_date, dt_time(end_h, end_m))
    all_slots = []
    while current + timedelta(minutes=duration) <= end_dt:
        all_slots.append(current.strftime("%H:%M"))
        current += timedelta(minutes=duration)

    # Remove slots already booked
    booked = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.branch_id == branch_id,
        Appointment.scheduled_at >= datetime.combine(target_date, dt_time.min),
        Appointment.scheduled_at <= datetime.combine(target_date, dt_time.max),
        Appointment.status.notin_([AppointmentStatus.cancelled, AppointmentStatus.no_show]),
    ).all()
    booked_times = {a.scheduled_at.strftime("%H:%M") for a in booked}

    # Remove blocked times
    blocks = db.query(DoctorScheduleBlock).filter_by(
        doctor_id=doctor_id, branch_id=branch_id, blocked_date=target_date
    ).all()
    for block in blocks:
        if block.all_day:
            return {"slots": []}
        if block.start_time and block.end_time:
            bstart_h, bstart_m = map(int, block.start_time.split(":"))
            bend_h, bend_m = map(int, block.end_time.split(":"))
            block_start = datetime.combine(target_date, dt_time(bstart_h, bstart_m))
            block_end = datetime.combine(target_date, dt_time(bend_h, bend_m))
            cur = block_start
            while cur < block_end:
                booked_times.add(cur.strftime("%H:%M"))
                cur += timedelta(minutes=duration)

    available = [s for s in all_slots if s not in booked_times]
    return {"slots": available, "duration_minutes": duration}


@router.post("/doctors/{doctor_id}/blocks", status_code=201)
def block_doctor_time(
    doctor_id: int,
    payload: dict,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    branch_id = payload.get("branch_id")
    if not branch_id or not payload.get("blocked_date"):
        raise HTTPException(status_code=400, detail="branch_id y blocked_date son requeridos.")
    try:
        blocked_date = date.fromisoformat(payload["blocked_date"])
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido (YYYY-MM-DD).")
    block = DoctorScheduleBlock(
        doctor_id=doctor_id,
        branch_id=branch_id,
        blocked_date=blocked_date,
        all_day=payload.get("all_day", False),
        start_time=payload.get("start_time"),
        end_time=payload.get("end_time"),
        reason=payload.get("reason"),
    )
    db.add(block)
    db.commit()
    db.refresh(block)
    return block.to_dict()


@router.delete("/doctors/{doctor_id}/blocks/{block_id}", status_code=204)
def delete_doctor_block(
    doctor_id: int,
    block_id: int,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    block = db.query(DoctorScheduleBlock).filter_by(id=block_id, doctor_id=doctor_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Bloqueo no encontrado.")
    db.delete(block)
    db.commit()
    return


# ─── Clinical Form Entries ─────────────────────────────────────────────────────

@router.get("/patients/{patient_id}/form-entries")
def list_form_entries(
    patient_id: int,
    form_type: Optional[str] = None,
    appointment_id: Optional[int] = None,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    """List all form entries for a patient (optionally filtered by form_type or appointment)."""
    q = db.query(ClinicalFormEntry).filter(ClinicalFormEntry.patient_id == patient_id)
    if form_type:
        q = q.filter(ClinicalFormEntry.form_type == form_type)
    if appointment_id:
        q = q.filter(ClinicalFormEntry.appointment_id == appointment_id)
    entries = q.order_by(ClinicalFormEntry.created_at.desc()).all()
    return {"entries": [e.to_dict() for e in entries]}


@router.get("/form-entries/{entry_id}")
def get_form_entry(
    entry_id: int,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    entry = db.query(ClinicalFormEntry).filter_by(id=entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Formulario no encontrado.")
    return entry.to_dict()


@router.post("/form-entries", status_code=201)
def create_form_entry(
    payload: dict,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    import json
    patient_id = payload.get("patient_id")
    if not patient_id:
        raise HTTPException(status_code=422, detail="patient_id es requerido.")
    patient = db.query(Patient).filter_by(id=patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado.")

    # business_id y branch_id vienen del payload o del JWT (no del objeto Client)
    business_id = payload.get("business_id") or claims.get("business_id")
    branch_id = payload.get("branch_id") or claims.get("active_branch_id") or claims.get("branch_id")
    if not business_id:
        raise HTTPException(status_code=422, detail="business_id es requerido.")
    # branch_id es opcional — la tabla lo acepta NULL
    branch_id_val = int(branch_id) if branch_id and int(branch_id) != 0 else None

    entry = ClinicalFormEntry(
        patient_id=patient_id,
        appointment_id=payload.get("appointment_id"),
        business_id=int(business_id),
        branch_id=branch_id_val,
        form_type=payload.get("form_type", "neurologica"),
        form_data=json.dumps(payload.get("form_data", {})),
        status=payload.get("status", "draft"),
        created_by=claims.get("username") or claims.get("sub"),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry.to_dict()


@router.patch("/form-entries/{entry_id}")
def update_form_entry(
    entry_id: int,
    payload: dict,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    import json
    entry = db.query(ClinicalFormEntry).filter_by(id=entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Formulario no encontrado.")
    if "form_data" in payload:
        entry.form_data = json.dumps(payload["form_data"])
    if "status" in payload:
        entry.status = payload["status"]
    if "appointment_id" in payload:
        entry.appointment_id = payload["appointment_id"]
    from datetime import datetime as _dt
    entry.updated_at = _dt.utcnow()
    db.commit()
    db.refresh(entry)
    return entry.to_dict()


@router.delete("/form-entries/{entry_id}", status_code=204)
def delete_form_entry(
    entry_id: int,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    entry = db.query(ClinicalFormEntry).filter_by(id=entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Formulario no encontrado.")
    db.delete(entry)
    db.commit()
    return
