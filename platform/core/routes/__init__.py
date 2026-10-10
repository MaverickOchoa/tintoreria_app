from core.routes.auth import router as auth_router
from core.routes.tenants import router as tenants_router
from core.routes.users import router as users_router
from core.routes.clients import router as clients_router
from core.routes.expenses import router as expenses_router

__all__ = ["auth_router", "tenants_router", "users_router", "clients_router", "expenses_router"]
