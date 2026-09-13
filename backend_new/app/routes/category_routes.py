# backend_new/app/routes/category_routes.py

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.category import Category
from app.models.service import Service

category_bp = Blueprint("category_bp", __name__)


def _role():
    claims = get_jwt()
    return (claims.get("role") or "").strip()


def _require_super_admin():
    if _role() != "super_admin":
        return {"message": "Super admin required"}, 403
    return None


def _require_read_access():
    if _role() not in ("super_admin", "business_admin"):
        return {"message": "Forbidden"}, 403
    return None


@category_bp.get("/service/<int:service_id>")
@jwt_required()
def list_categories_for_service(service_id: int):
    err = _require_read_access()
    if err:
        return err

    service = Service.query.get(service_id)
    if not service:
        return {"message": "Service not found"}, 404

    categories = Category.query.filter_by(service_id=service_id).order_by(Category.id.asc()).all()

    return {
        "service": {"id": service.id, "name": service.name},
        "categories": [{"id": c.id, "name": c.name, "service_id": c.service_id} for c in categories],
    }, 200


@category_bp.post("/service/<int:service_id>")
@jwt_required()
def create_category_for_service(service_id: int):
    err = _require_super_admin()
    if err:
        return err

    service = Service.query.get(service_id)
    if not service:
        return {"message": "Service not found"}, 404

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()

    if not name:
        return {"message": "name is required"}, 400

    cat = Category(service_id=service_id, name=name)

    try:
        db.session.add(cat)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return {"message": "Category already exists for this service"}, 409

    return {
        "message": "Category created",
        "category": {"id": cat.id, "name": cat.name, "service_id": cat.service_id},
    }, 201


@category_bp.put("/<int:category_id>")
@jwt_required()
def update_category(category_id: int):
    err = _require_super_admin()
    if err:
        return err

    cat = Category.query.get(category_id)
    if not cat:
        return {"message": "Category not found"}, 404

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()

    if not name:
        return {"message": "name is required"}, 400

    cat.name = name

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return {"message": "Category already exists for this service"}, 409

    return {
        "message": "Category updated",
        "category": {"id": cat.id, "name": cat.name, "service_id": cat.service_id},
    }, 200


@category_bp.delete("/<int:category_id>")
@jwt_required()
def delete_category(category_id: int):
    err = _require_super_admin()
    if err:
        return err

    cat = Category.query.get(category_id)
    if not cat:
        return {"message": "Category not found"}, 404

    db.session.delete(cat)
    db.session.commit()
    return {"message": "Category deleted"}, 200
