# backend_new/app/routes/branch_routes.py

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt

from app.auth.decorators import superadmin_required
from app.extensions import db
from app.models.branch import Branch
from app.models.business import Business

branch_bp = Blueprint("branch_bp", __name__)


@branch_bp.get("/test")
@superadmin_required
def test_branch():
    return {"ok": True, "message": "branch blueprint alive"}


# ✅ SUPER ADMIN: crear sucursal para un negocio específico
@branch_bp.post("/business/<int:business_id>")
@superadmin_required
def create_branch_for_business(business_id: int):
    data = request.get_json(silent=True) or {}

    name = (data.get("name") or "").strip()
    address = (data.get("address") or "").strip()

    if not name:
        return {"message": "name is required"}, 400

    business = Business.query.get(business_id)
    if not business:
        return {"message": "Business not found"}, 404

    branch = Branch(
        name=name,
        address=address if address else None,
        business_id=business_id,
    )

    db.session.add(branch)
    db.session.commit()

    return {
        "message": "Branch created",
        "branch": {"id": branch.id, "name": branch.name, "address": branch.address},
    }, 201


# ✅ SUPER ADMIN: listar sucursales de un negocio
@branch_bp.get("/business/<int:business_id>")
@superadmin_required
def get_branches_for_business(business_id: int):
    business = Business.query.get(business_id)
    if not business:
        return {"message": "Business not found"}, 404

    branches = (
        Branch.query.filter_by(business_id=business_id)
        .order_by(Branch.id.asc())
        .all()
    )

    return {
        "business_id": business_id,
        "branches": [{"id": b.id, "name": b.name, "address": b.address} for b in branches],
    }, 200


# ✅ SUPER ADMIN: obtener una sucursal por id (para pantalla Edit)
@branch_bp.get("/<int:branch_id>")
@superadmin_required
def get_branch(branch_id: int):
    b = Branch.query.get(branch_id)
    if not b:
        return {"message": "Branch not found"}, 404

    return {
        "id": b.id,
        "name": b.name,
        "address": b.address,
        "business_id": b.business_id,
    }, 200


# ✅ SUPER ADMIN: editar una sucursal
@branch_bp.put("/<int:branch_id>")
@superadmin_required
def update_branch(branch_id: int):
    b = Branch.query.get(branch_id)
    if not b:
        return {"message": "Branch not found"}, 404

    data = request.get_json(silent=True) or {}

    name = (data.get("name") or "").strip()
    address = (data.get("address") or "").strip()

    if not name:
        return {"message": "name is required"}, 400

    b.name = name
    b.address = address if address else None

    db.session.commit()

    return {
        "message": "Branch updated",
        "branch": {"id": b.id, "name": b.name, "address": b.address, "business_id": b.business_id},
    }, 200


# ✅ BUSINESS ADMIN: listar MIS sucursales (por token)
@branch_bp.get("/mine")
@jwt_required()
def my_branches():
    claims = get_jwt()
    role = claims.get("role")
    business_id = claims.get("business_id")

    if role != "business_admin":
        return {"message": "Forbidden"}, 403

    if not business_id:
        return {"message": "No business_id in token"}, 400

    branches = (
        Branch.query.filter_by(business_id=business_id)
        .order_by(Branch.id.asc())
        .all()
    )

    return {
        "business_id": business_id,
        "branches": [{"id": b.id, "name": b.name, "address": b.address} for b in branches],
    }, 200
