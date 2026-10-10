# backend_new/app/routes/service_routes.py

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.service import Service

service_bp = Blueprint("service_bp", __name__)


def _role():
    claims = get_jwt()
    return (claims.get("role") or "").strip()


def _require_super_admin():
    if _role() != "super_admin":
        return {"message": "Super admin required"}, 403
    return None


def _require_read_access():
    """
    Lectura global permitida para:
    - super_admin
    - business_admin
    (Si luego agregas colaboradores, aquí los metes)
    """
    if _role() not in ("super_admin", "business_admin"):
        return {"message": "Forbidden"}, 403
    return None


@service_bp.get("/")
@jwt_required()
def list_services():
    err = _require_read_access()
    if err:
        return err

    services = Service.query.order_by(Service.id.asc()).all()
    return {
        "services": [{"id": s.id, "name": s.name} for s in services]
    }, 200


@service_bp.get("/<int:service_id>")
@jwt_required()
def get_service(service_id: int):
    err = _require_read_access()
    if err:
        return err

    service = Service.query.get(service_id)
    if not service:
        return {"message": "Service not found"}, 404

    return {"id": service.id, "name": service.name}, 200


@service_bp.post("/")
@jwt_required()
def create_service():
    err = _require_super_admin()
    if err:
        return err

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()

    if not name:
        return {"message": "name is required"}, 400

    service = Service(name=name)

    try:
        db.session.add(service)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return {"message": "Service already exists"}, 409

    return {"message": "Service created", "service": {"id": service.id, "name": service.name}}, 201


@service_bp.put("/<int:service_id>")
@jwt_required()
def update_service(service_id: int):
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

    service.name = name

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return {"message": "Service already exists"}, 409

    return {"message": "Service updated", "service": {"id": service.id, "name": service.name}}, 200


@service_bp.delete("/<int:service_id>")
@jwt_required()
def delete_service(service_id: int):
    err = _require_super_admin()
    if err:
        return err

    service = Service.query.get(service_id)
    if not service:
        return {"message": "Service not found"}, 404

    db.session.delete(service)
    db.session.commit()
    return {"message": "Service deleted"}, 200
