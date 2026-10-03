from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt
from sqlalchemy import func
from werkzeug.security import generate_password_hash

from app.extensions import db
from app.models.user import User
from app.models.branch import Branch

user_bp = Blueprint("user_bp", __name__)


def _normalize_spaces(s: str) -> str:
    if s is None:
        return ""
    s = str(s).strip()
    parts = s.split()
    return " ".join(parts)


def _require_auth():
    claims = get_jwt()
    role = claims.get("role")
    business_id = claims.get("business_id")
    branch_id = claims.get("branch_id")
    return role, business_id, branch_id


def _make_username(base_username: str, branch_name: str) -> str:
    base = _normalize_spaces(base_username)
    br = _normalize_spaces(branch_name)
    return f"{base}@{br}"


def _exists_username_ci(username: str) -> bool:
    return (
        db.session.query(User.id)
        .filter(func.lower(User.username) == func.lower(username))
        .first()
        is not None
    )


def _ensure_branches_belong_to_business(branch_ids, business_id: int):
    branches = (
        Branch.query.filter(Branch.id.in_(branch_ids))
        .order_by(Branch.id.asc())
        .all()
    )
    if len(branches) != len(branch_ids):
        return None, ({"message": "Una o más sucursales no existen"}, 404)

    for b in branches:
        if int(b.business_id) != int(business_id):
            return None, ({"message": "Forbidden: sucursal fuera del negocio"}, 403)

    return branches, None


@user_bp.post("/branch-managers")
@jwt_required()
def create_branch_manager():
    """
    SOLO business_admin
    Crea múltiples cuentas si branch_ids trae varias sucursales:
    Body:
    {
      "base_username": "Juan Pérez",
      "password": "xxx",
      "branch_ids": [1,2,3]
    }
    """
    role, business_id, _branch_id = _require_auth()

    if role != "business_admin":
        return {"message": "Forbidden"}, 403
    if not business_id:
        return {"message": "No business_id in token"}, 400

    data = request.get_json(silent=True) or {}
    base_username = _normalize_spaces(data.get("base_username") or "")
    password = (data.get("password") or "").strip()
    branch_ids = data.get("branch_ids") or []

    if not base_username:
        return {"message": "base_username is required"}, 400
    if not password:
        return {"message": "password is required"}, 400
    if not isinstance(branch_ids, list) or len(branch_ids) == 0:
        return {"message": "branch_ids must be a non-empty array"}, 400

    branch_ids = [int(x) for x in branch_ids]
    branches, err = _ensure_branches_belong_to_business(branch_ids, business_id)
    if err:
        return err

    created = []
    # Validación previa: que ninguno choque
    for b in branches:
        final_username = _make_username(base_username, b.name)
        if _exists_username_ci(final_username):
            return {
                "message": f"Username ya existe: {final_username}"
            }, 409

    # Crear
    for b in branches:
        final_username = _make_username(base_username, b.name)
        u = User(
            username=final_username,
            password_hash=generate_password_hash(password),
            is_superadmin=False,
            business_id=int(business_id),
            role="branch_manager",
            branch_id=b.id,
        )
        db.session.add(u)
        created.append(
            {
                "username": final_username,
                "role": "branch_manager",
                "branch_id": b.id,
                "branch_name": b.name,
            }
        )

    db.session.commit()
    return {"message": "Branch manager accounts created", "created": created}, 201


@user_bp.post("/employees")
@jwt_required()
def create_employee():
    """
    business_admin -> puede crear employees en varias sucursales (multi-cuenta)
    branch_manager -> solo puede crear employees para SU sucursal (una cuenta)
    Body:
    {
      "base_username": "Juan Pérez",
      "password": "xxx",
      "branch_ids": [1,2]   # para business_admin
    }
    """
    role, business_id, token_branch_id = _require_auth()

    if role not in ("business_admin", "branch_manager"):
        return {"message": "Forbidden"}, 403
    if not business_id:
        return {"message": "No business_id in token"}, 400

    data = request.get_json(silent=True) or {}
    base_username = _normalize_spaces(data.get("base_username") or "")
    password = (data.get("password") or "").strip()
    branch_ids = data.get("branch_ids") or []

    if not base_username:
        return {"message": "base_username is required"}, 400
    if not password:
        return {"message": "password is required"}, 400

    # branch_manager: forzamos su sucursal
    if role == "branch_manager":
        if not token_branch_id:
            return {"message": "No branch_id in token"}, 400
        branch_ids = [int(token_branch_id)]
    else:
        # business_admin
        if not isinstance(branch_ids, list) or len(branch_ids) == 0:
            return {"message": "branch_ids must be a non-empty array"}, 400
        branch_ids = [int(x) for x in branch_ids]

    branches, err = _ensure_branches_belong_to_business(branch_ids, business_id)
    if err:
        return err

    created = []
    for b in branches:
        final_username = _make_username(base_username, b.name)
        if _exists_username_ci(final_username):
            return {"message": f"Username ya existe: {final_username}"}, 409

    for b in branches:
        final_username = _make_username(base_username, b.name)
        u = User(
            username=final_username,
            password_hash=generate_password_hash(password),
            is_superadmin=False,
            business_id=int(business_id),
            role="employee",
            branch_id=b.id,
        )
        db.session.add(u)
        created.append(
            {
                "username": final_username,
                "role": "employee",
                "branch_id": b.id,
                "branch_name": b.name,
            }
        )

    db.session.commit()
    return {"message": "Employee accounts created", "created": created}, 201
