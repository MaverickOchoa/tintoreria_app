from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.routes.auth import router as auth_router
from core.routes.tenants import router as tenants_router
from core.routes.users import router as users_router
from core.routes.clients import router as clients_router
from core.routes.expenses import router as expenses_router
from verticals.laundry.routes import router as laundry_router
from verticals.clinic.routes import router as clinic_router

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
        "https://zentro.onrender.com",
        "https://tintoreria-frontend.onrender.com",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
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
