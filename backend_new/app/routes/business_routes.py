# backend_new/app/routes/business_routes.py

from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.business import Business
from app.models.user import User
from app.models.branch import Branch
from app.utils.decorators import require_superadmin, require_business_or_superadmin

business_bp = Blueprint("business_bp", __name__)

@business_bp.get("/")
@require_superadmin
def list_businesses():
    businesses = Business.query.order_by(Business.id.asc()).all()
    return jsonify({
        "businesses": [
            {
                "id": b.id,
                "name": b.name,
                "owner_user_id": b.owner_user_id,
                "branches_count": len(b.branches) if b.branches is not None else 0,
            }
            for b in businesses
        ]
    }), 200

@business_bp.get("/<int:business_id>")
@require_business_or_superadmin("business_id")
def get_business(business_id: int):
    b = Business.query.get_or_404(business_id)
    return jsonify({
        "id": b.id,
        "name": b.name,
        "owner_user_id": b.owner_user_id,
        "branches_count": len(b.branches) if b.branches is not None else 0,
    }), 200

@business_bp.post("/")
@require_superadmin
def create_business():
    data = request.get_json(silent=True) or {}

    name = (data.get("name") or "").strip()
    owner_username = (data.get("owner_username") or "").strip()
    owner_password = (data.get("owner_password") or "").strip()
    branch_name = (data.get("branch_name") or "").strip()
    branch_address = (data.get("branch_address") or "").strip()

    if not all([name, owner_username, owner_password, branch_name]):
        return jsonify({"message": "Missing required fields"}), 400

    existing_business = Business.query.filter(db.func.lower(Business.name) == name.lower()).first()
    if existing_business:
        return jsonify({"message": "Business already exists"}), 409

    existing_user = User.query.filter(db.func.lower(User.username) == owner_username.lower()).first()
    if existing_user:
        return jsonify({"message": "Owner username already exists"}), 409

    owner = User(username=owner_username, is_superadmin=False)
    owner.set_password(owner_password)

    b = Business(name=name)
    db.session.add(b)
    db.session.flush()  # para tener b.id

    b.owner_user_id = owner.id  # todavía no existe, se arregla tras flush owner
    owner.business_id = b.id

    db.session.add(owner)
    db.session.flush()

    b.owner_user_id = owner.id

    br = Branch(name=branch_name, address=branch_address, business_id=b.id)
    db.session.add(br)

    db.session.commit()

    return jsonify({
        "business": {"id": b.id, "name": b.name},
        "owner": {"id": owner.id, "username": owner.username},
        "branch": {"id": br.id, "name": br.name, "address": br.address},
    }), 201

@business_bp.put("/<int:business_id>")
@require_superadmin
def update_business(business_id: int):
    b = Business.query.get_or_404(business_id)
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()

    if not name:
        return jsonify({"message": "name is required"}), 400

    exists = Business.query.filter(
        db.func.lower(Business.name) == name.lower(),
        Business.id != b.id
    ).first()
    if exists:
        return jsonify({"message": "Business name already exists"}), 409

    b.name = name
    db.session.commit()
    return jsonify({"business": {"id": b.id, "name": b.name}}), 200
