from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
import logging

from core.database import engine
from core.routes.auth import router as auth_router
from core.routes.tenants import router as tenants_router
from core.routes.users import router as users_router
from core.routes.clients import router as clients_router
from core.routes.expenses import router as expenses_router
from verticals.laundry.routes import router as laundry_router
from verticals.clinic.routes import router as clinic_router

logger = logging.getLogger(__name__)

app = FastAPI(
    title="SaaS Platform API",
    description="Multi-vertical SaaS — Laundry, Clinic, Barbershop, Cafe",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://zentro-iik7.onrender.com",
        "https://zentro-5b3g.onrender.com",
        "https://zentro.onrender.com",
        "https://tintoreria-frontend.onrender.com",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_STARTUP_MIGRATIONS = [
    # Consent columns
    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS consent_whatsapp BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS consent_email BOOLEAN NOT NULL DEFAULT FALSE",
    # Clinic core tables
    """CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL UNIQUE REFERENCES clients(id),
        blood_type VARCHAR(10),
        allergies TEXT,
        emergency_contact_name VARCHAR(150),
        emergency_contact_phone VARCHAR(20),
        occupation VARCHAR(100),
        medical_history TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )""",
    """CREATE TABLE IF NOT EXISTS clinic_services (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL REFERENCES businesses(id),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        duration_minutes INTEGER NOT NULL DEFAULT 30,
        price FLOAT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE
    )""",
    """CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL REFERENCES businesses(id),
        branch_id INTEGER NOT NULL REFERENCES branches(id),
        patient_id INTEGER NOT NULL REFERENCES patients(id),
        doctor_id INTEGER REFERENCES employees(id),
        clinic_service_id INTEGER REFERENCES clinic_services(id),
        scheduled_at TIMESTAMP NOT NULL,
        duration_minutes INTEGER NOT NULL DEFAULT 30,
        status VARCHAR(30) NOT NULL DEFAULT 'Agendada',
        notes TEXT,
        reason VARCHAR(255),
        created_by VARCHAR(120),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP
    )""",
    """CREATE TABLE IF NOT EXISTS clinical_records (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES patients(id),
        appointment_id INTEGER REFERENCES appointments(id),
        doctor_id INTEGER REFERENCES employees(id),
        business_id INTEGER NOT NULL REFERENCES businesses(id),
        branch_id INTEGER NOT NULL REFERENCES branches(id),
        chief_complaint TEXT,
        diagnosis TEXT,
        treatment TEXT,
        prescription TEXT,
        next_appointment_notes TEXT,
        vital_signs TEXT,
        record_date TIMESTAMP NOT NULL DEFAULT NOW(),
        created_by VARCHAR(120)
    )""",
    # Branch config tables
    """CREATE TABLE IF NOT EXISTS clinic_branch_schedules (
        id SERIAL PRIMARY KEY,
        branch_id INTEGER NOT NULL REFERENCES branches(id),
        business_id INTEGER NOT NULL REFERENCES businesses(id),
        day_of_week INTEGER NOT NULL,
        is_open BOOLEAN NOT NULL DEFAULT TRUE,
        open_time VARCHAR(5) NOT NULL DEFAULT '09:00',
        close_time VARCHAR(5) NOT NULL DEFAULT '18:00',
        CONSTRAINT uq_branch_day UNIQUE (branch_id, day_of_week)
    )""",
    """CREATE TABLE IF NOT EXISTS clinic_branch_messages (
        id SERIAL PRIMARY KEY,
        branch_id INTEGER NOT NULL REFERENCES branches(id),
        business_id INTEGER NOT NULL REFERENCES businesses(id),
        trigger_key VARCHAR(60) NOT NULL,
        channel VARCHAR(20) NOT NULL,
        text TEXT NOT NULL DEFAULT '',
        CONSTRAINT uq_branch_msg UNIQUE (branch_id, trigger_key, channel)
    )""",
    """CREATE TABLE IF NOT EXISTS clinic_promotions (
        id SERIAL PRIMARY KEY,
        branch_id INTEGER NOT NULL REFERENCES branches(id),
        business_id INTEGER NOT NULL REFERENCES businesses(id),
        name VARCHAR(120) NOT NULL,
        description TEXT,
        discount_pct FLOAT NOT NULL DEFAULT 0,
        min_orders INTEGER,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )""",
    # Doctor schedule tables
    """CREATE TABLE IF NOT EXISTS clinic_doctor_schedules (
        id SERIAL PRIMARY KEY,
        doctor_id INTEGER NOT NULL REFERENCES employees(id),
        branch_id INTEGER NOT NULL REFERENCES branches(id),
        business_id INTEGER NOT NULL REFERENCES businesses(id),
        day_of_week INTEGER NOT NULL,
        is_available BOOLEAN NOT NULL DEFAULT TRUE,
        start_time VARCHAR(5) NOT NULL DEFAULT '09:00',
        end_time VARCHAR(5) NOT NULL DEFAULT '17:00',
        slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
        CONSTRAINT uq_doctor_day UNIQUE (doctor_id, branch_id, day_of_week)
    )""",
    """CREATE TABLE IF NOT EXISTS clinic_doctor_blocks (
        id SERIAL PRIMARY KEY,
        doctor_id INTEGER NOT NULL REFERENCES employees(id),
        branch_id INTEGER NOT NULL REFERENCES branches(id),
        blocked_date DATE NOT NULL,
        all_day BOOLEAN NOT NULL DEFAULT FALSE,
        start_time VARCHAR(5),
        end_time VARCHAR(5),
        reason VARCHAR(200)
    )""",
    # Indexes
    "CREATE INDEX IF NOT EXISTS ix_appointments_business_branch ON appointments(business_id, branch_id)",
    "CREATE INDEX IF NOT EXISTS ix_appointments_scheduled_at ON appointments(scheduled_at)",
    "CREATE INDEX IF NOT EXISTS ix_appointments_patient ON appointments(patient_id)",
    "CREATE INDEX IF NOT EXISTS ix_clinical_records_patient ON clinical_records(patient_id)",
    "CREATE INDEX IF NOT EXISTS ix_patients_client ON patients(client_id)",
    "CREATE INDEX IF NOT EXISTS ix_doctor_schedule_doctor ON clinic_doctor_schedules(doctor_id)",
    "CREATE INDEX IF NOT EXISTS ix_doctor_blocks_date ON clinic_doctor_blocks(blocked_date)",
]


@app.on_event("startup")
async def apply_migrations():
    try:
        with engine.connect() as conn:
            for sql in _STARTUP_MIGRATIONS:
                try:
                    conn.execute(text(sql))
                    conn.commit()
                except Exception as e:
                    conn.rollback()
                    logger.warning("Migration skipped (%s): %s", sql[:60], e)
        logger.info("Startup migrations applied.")
    except Exception as e:
        logger.error("Startup migration failed: %s", e)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


API_V2 = "/api/v2"

app.include_router(auth_router, prefix=API_V2)
app.include_router(tenants_router, prefix=API_V2)
app.include_router(users_router, prefix=API_V2)
app.include_router(clients_router, prefix=API_V2)
app.include_router(expenses_router, prefix=API_V2)
app.include_router(laundry_router, prefix=API_V2)
app.include_router(clinic_router, prefix=API_V2)


@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}
