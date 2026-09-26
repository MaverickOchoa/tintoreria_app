from flask import Blueprint, request
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
)
from werkzeug.security import check_password_hash
from sqlalchemy import func

from app.models.user import User
from app.models.branch import Branch

auth_bp = Blueprint("auth_bp", __name__)


def _normalize_spaces(s: str) -> str:
    """
    - trim
    - colapsa espacios múltiples a uno
    """
    if s is None:
        return ""
    s = str(s).strip()
    # colapsa múltiples espacios/tabs a 1 espacio
    parts = s.split()
    return " ".join(parts)


@auth_bp.get("/whoami")
@jwt_required(optional=True)
def whoami():
    identity = get_jwt_identity()
    if not identity:
        return {"ok": True, "message": "auth blueprint alive", "authenticated": False}, 200

    return {"ok": True, "authenticated": True, "user_id": identity, "claims": get_jwt()}, 200


@auth_bp.post("/login")
def login():
    """
    Login unificado:
    - Super Admin
    - Business Admin
    - Branch Manager
    - Employee

    Case-insensitive para username.
    """
    data = request.get_json(silent=True) or {}
    username_in = _normalize_spaces(data.get("username") or "")
    password = (data.get("password") or "").strip()

    if not username_in or not password:
        return {"message": "username y password son requeridos"}, 400

    # case-insensitive match
    user = (
        User.query.filter(func.lower(User.username) == func.lower(username_in))
        .first()
    )

    if not user or not check_password_hash(user.password_hash, password):
        return {"message": "Credenciales inválidas"}, 401

    # rol
    if user.is_superadmin:
        role = "super_admin"
    else:
        # si ya existe role en la tabla, úsalo
        if user.role:
            role = user.role
        else:
            # fallback legacy
            role = "business_admin" if user.owned_business is not None else "employee"

    business_id = user.business_id if not user.is_superadmin else None
    branch_id = user.branch_id if not user.is_superadmin else None

    # branches: solo para business_admin
    branches = []
    if role == "business_admin" and business_id:
        brs = (
            Branch.query.filter_by(business_id=business_id)
            .order_by(Branch.id.asc())
            .all()
        )
        branches = [{"id": b.id, "name": b.name} for b in brs]

    claims = {
        "role": role,
        "is_superadmin": bool(user.is_superadmin),
        "business_id": business_id,
        "branch_id": branch_id,
    }

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims=claims,
    )

    return {
        "access_token": access_token,
        "role": role,
        "business_id": business_id,
        "branch_id": branch_id,
        "branches": branches,
    }, 200
