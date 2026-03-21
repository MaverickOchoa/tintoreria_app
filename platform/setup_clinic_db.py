import psycopg2

conn = psycopg2.connect('postgresql://postgres:YoYo158087@localhost/tintoreria_db')
cur = conn.cursor()

tables_sql = [
    """
    CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL UNIQUE REFERENCES clients(id),
        blood_type VARCHAR(10),
        allergies TEXT,
        emergency_contact_name VARCHAR(150),
        emergency_contact_phone VARCHAR(20),
        occupation VARCHAR(100),
        medical_history TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS clinic_services (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL REFERENCES businesses(id),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        duration_minutes INTEGER NOT NULL DEFAULT 30,
        price FLOAT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS appointments (
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
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS clinical_records (
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
    )
    """,
]

indexes_sql = [
    "CREATE INDEX IF NOT EXISTS ix_appointments_business_branch ON appointments(business_id, branch_id)",
    "CREATE INDEX IF NOT EXISTS ix_appointments_scheduled_at ON appointments(scheduled_at)",
    "CREATE INDEX IF NOT EXISTS ix_clinical_records_patient ON clinical_records(patient_id)",
]

for sql in tables_sql:
    cur.execute(sql)
    print(f"Table created/verified")

for sql in indexes_sql:
    cur.execute(sql)
    print(f"Index created/verified")

cur.execute("UPDATE alembic_version SET version_num = 'a1b2c3d4e5f6'")
print("Alembic version stamped: a1b2c3d4e5f6")

conn.commit()
conn.close()
print("Done.")
