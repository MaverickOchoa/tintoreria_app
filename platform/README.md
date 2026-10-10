# Platform — FastAPI Multi-Vertical SaaS

## Estructura

```
platform/
├── core/                  # Módulos compartidos (todos los verticales)
│   ├── config.py          # Settings (pydantic-settings, carga .env)
│   ├── database.py        # SQLAlchemy engine + SessionLocal + Base
│   ├── security.py        # JWT encode/decode, bcrypt hashing
│   ├── dependencies.py    # FastAPI Depends: auth guards
│   ├── models/            # Modelos ORM compartidos
│   │   ├── tenant.py      # Business, Branch, BusinessHour, BusinessHoliday
│   │   ├── user.py        # Admin, Employee, Role
│   │   ├── client.py      # Client, ClientType, ClientDiscount
│   │   ├── payment.py     # OrderPayment, CashCut
│   │   ├── expense.py     # Expense, MonthlyGoal
│   │   └── promotion.py   # Promotion, PromoRequiredLine, PromoRewardLine
│   ├── schemas/           # Pydantic schemas request/response
│   └── routes/            # Endpoints compartidos
│       ├── auth.py        # POST /auth/login, POST /auth/select-branch
│       ├── tenants.py     # CRUD /businesses, /branches, /branches/{id}/scan-config
│       ├── users.py       # CRUD /employees, /roles
│       ├── clients.py     # CRUD /clients, /client-types
│       └── expenses.py    # CRUD /expenses, /goals
│
├── verticals/
│   ├── laundry/           # Tintorería
│   │   ├── models.py      # Order, OrderItem, OrderGarmentTicket, Item, Category, Service
│   │   ├── schemas.py     # Pydantic para órdenes e ítems
│   │   ├── services.py    # Lógica de negocio: create_order, calculate_delivery_date
│   │   └── routes.py      # /laundry/orders, /laundry/items, /laundry/services
│   │
│   └── clinic/            # Clínicas / Dentales / Fisio
│       ├── models.py      # Patient, Appointment, ClinicalRecord, ClinicService
│       ├── schemas.py     # Pydantic para citas y expedientes
│       └── routes.py      # /clinic/patients, /clinic/appointments, /clinic/records
│
├── main.py                # FastAPI app — monta todos los routers bajo /api/v2/
├── requirements.txt       # FastAPI, SQLAlchemy, pydantic, jose, passlib, etc.
├── alembic.ini            # Config de Alembic para migraciones
├── env.example            # Variables de entorno requeridas
└── Procfile               # Para Render: uvicorn main:app
```

---

## Setup local

```bash
# 1. Crear entorno virtual
cd platform
python -m venv .venv
.venv\Scripts\activate     # Windows
source .venv/bin/activate  # Linux/Mac

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Crear archivo .env (copiar env.example)
copy env.example .env
# Editar DATABASE_URL y JWT_SECRET_KEY en .env

# 4. Inicializar migraciones Alembic
alembic init migrations
# Editar migrations/env.py para importar Base y todos los modelos

# 5. Crear tablas nuevas (patients, appointments, clinical_records, clinic_services)
alembic revision --autogenerate -m "add_clinic_tables"
alembic upgrade head

# 6. Arrancar servidor
uvicorn main:app --reload --port 8001
```

---

## API Docs

Con el servidor corriendo:
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

---

## Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/v2/auth/login | Login unificado (admin, empleado) |
| POST | /api/v2/auth/select-branch | Cambiar sucursal activa |
| GET | /api/v2/businesses/{id} | Info del negocio |
| GET/PUT | /api/v2/branches/{id} | Config de sucursal |
| GET | /api/v2/branches/{id}/scan-config | Config de escaneo |
| PATCH | /api/v2/branches/{id}/scan-config | Activar/desactivar escaneo |
| GET/POST | /api/v2/employees | Empleados |
| GET/POST | /api/v2/clients | Clientes |
| GET/POST | /api/v2/expenses | Gastos e insumos |
| GET/POST | /api/v2/goals | Metas mensuales |
| POST | /api/v2/laundry/orders | Crear orden de tintorería |
| GET | /api/v2/laundry/orders | Listar órdenes |
| PATCH | /api/v2/laundry/orders/{id}/status | Cambiar status |
| POST | /api/v2/laundry/orders/{id}/scan-garment | Escanear prenda |
| POST | /api/v2/clinic/patients | Crear paciente |
| GET | /api/v2/clinic/appointments | Listar citas |
| POST | /api/v2/clinic/appointments | Crear cita |
| GET | /api/v2/clinic/calendar | Vista calendario |
| POST | /api/v2/clinic/records | Crear expediente clínico |
| GET | /api/v2/clinic/patients/{id}/records | Historial del paciente |

---

## Coexistencia con Flask (Strangler Fig)

- Flask corre en `/api/v1/...` — **no se toca**
- FastAPI corre en `/api/v2/...` — nuevo código limpio
- Misma PostgreSQL, mismas tablas — el nuevo código lee/escribe los mismos datos
- Cuando clínicas esté en producción, se migra tintorería a v2 y se depreca v1

---

## Deploy en Render

1. Crear nuevo servicio Web en Render apuntando a la carpeta `platform/`
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Variables de entorno: `DATABASE_URL` y `JWT_SECRET_KEY`

---

## Siguiente paso: tablas nuevas en DB

Las tablas nuevas que necesitan ser creadas en producción son:
- `patients`
- `clinic_services`
- `appointments`
- `clinical_records`

Las tablas existentes (orders, branches, businesses, etc.) **no se modifican**.
