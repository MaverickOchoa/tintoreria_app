from decimal import Decimal, InvalidOperation

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.branch import Branch
from app.models.item import Item
from app.models.branch_item_override import BranchItemOverride


branch_item_override_bp = Blueprint("branch_item_override_bp", __name__)


def _require_business_admin():
    claims = get_jwt()
    role = claims.get("role")
    business_id = claims.get("business_id")

    if role != "business_admin":
        return None, ({"message": "Forbidden"}, 403)
    if not business_id:
        return None, ({"message": "No business_id in token"}, 400)

    return int(business_id), None


def _ensure_branch_belongs_to_business(branch_id: int, business_id: int):
    br = Branch.query.get(branch_id)
    if not br:
        return None, ({"message": "Branch not found"}, 404)
    if int(br.business_id) != int(business_id):
        return None, ({"message": "Forbidden"}, 403)
    return br, None


def _ensure_item_belongs_to_business(item_id: int, business_id: int):
    it = Item.query.get(item_id)
    if not it:
        return None, ({"message": "Item not found"}, 404)
    if int(it.business_id) != int(business_id):
        return None, ({"message": "Forbidden"}, 403)
    return it, None


@branch_item_override_bp.get("/branch/<int:branch_id>/item/<int:item_id>")
@jwt_required()
def get_override(branch_id: int, item_id: int):
    business_id, err = _require_business_admin()
    if err:
        return err

    _, err = _ensure_branch_belongs_to_business(branch_id, business_id)
    if err:
        return err

    _, err = _ensure_item_belongs_to_business(item_id, business_id)
    if err:
        return err

    ov = BranchItemOverride.query.filter_by(branch_id=branch_id, item_id=item_id).first()
    if not ov:
        return {"message": "Override not found"}, 404

    return {
        "override": {
            "id": ov.id,
            "branch_id": ov.branch_id,
            "item_id": ov.item_id,
            "price_override": str(ov.price_override),
        }
    }, 200


@branch_item_override_bp.put("/branch/<int:branch_id>/item/<int:item_id>")
@jwt_required()
def upsert_override(branch_id: int, item_id: int):
    """
    Upsert: crea o actualiza el override de precio por sucursal.
    Body: { "price_override": 123.45 }
    """
    business_id, err = _require_business_admin()
    if err:
        return err

    _, err = _ensure_branch_belongs_to_business(branch_id, business_id)
    if err:
        return err

    _, err = _ensure_item_belongs_to_business(item_id, business_id)
    if err:
        return err

    data = request.get_json(silent=True) or {}
    raw = data.get("price_override", None)

    if raw is None or str(raw).strip() == "":
        return {"message": "price_override is required"}, 400

    try:
        price_override = Decimal(str(raw))
    except (InvalidOperation, ValueError):
        return {"message": "price_override must be a valid number"}, 400

    ov = BranchItemOverride.query.filter_by(branch_id=branch_id, item_id=item_id).first()
    created = False

    if not ov:
        ov = BranchItemOverride(
            branch_id=branch_id,
            item_id=item_id,
            price_override=price_override,
        )
        db.session.add(ov)
        created = True
    else:
        ov.price_override = price_override

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return {"message": "Could not save override"}, 409

    return {
        "message": "Override created" if created else "Override updated",
        "override": {
            "id": ov.id,
            "branch_id": ov.branch_id,
            "item_id": ov.item_id,
            "price_override": str(ov.price_override),
        },
    }, 200


@branch_item_override_bp.delete("/branch/<int:branch_id>/item/<int:item_id>")
@jwt_required()
def delete_override(branch_id: int, item_id: int):
    business_id, err = _require_business_admin()
    if err:
        return err

    _, err = _ensure_branch_belongs_to_business(branch_id, business_id)
    if err:
        return err

    _, err = _ensure_item_belongs_to_business(item_id, business_id)
    if err:
        return err

    ov = BranchItemOverride.query.filter_by(branch_id=branch_id, item_id=item_id).first()
    if not ov:
        return {"message": "Override not found"}, 404

    db.session.delete(ov)
    db.session.commit()

    return {"message": "Override deleted"}, 200
