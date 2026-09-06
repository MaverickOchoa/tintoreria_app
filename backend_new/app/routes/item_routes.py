from decimal import Decimal, InvalidOperation

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.item import Item
from app.models.category import Category
from app.models.branch_item_override import BranchItemOverride


item_bp = Blueprint("item_bp", __name__)


def _require_business_admin():
    claims = get_jwt()
    role = claims.get("role")
    business_id = claims.get("business_id")
    if role != "business_admin":
        return None, ({"message": "Forbidden"}, 403)
    if not business_id:
        return None, ({"message": "No business_id in token"}, 400)
    return int(business_id), None


@item_bp.get("/category/<int:category_id>")
@jwt_required()
def list_items_for_category(category_id: int):
    business_id, err = _require_business_admin()
    if err:
        return err

    category = Category.query.get(category_id)
    if not category:
        return {"message": "Category not found"}, 404

    # opcional: para calcular precio efectivo por sucursal
    branch_id = request.args.get("branch_id", type=int)

    items = (
        Item.query.filter_by(business_id=business_id, category_id=category_id)
        .order_by(Item.id.asc())
        .all()
    )

    # precargar overrides si viene branch_id
    overrides_by_item_id = {}
    if branch_id:
        overrides = (
            BranchItemOverride.query.filter_by(branch_id=branch_id)
            .filter(BranchItemOverride.item_id.in_([it.id for it in items]))
            .all()
        )
        overrides_by_item_id = {ov.item_id: ov for ov in overrides}

    out = []
    for it in items:
        ov = overrides_by_item_id.get(it.id) if branch_id else None
        price_base = it.price
        price_effective = ov.price_override if ov else it.price

        out.append(
            {
                "id": it.id,
                "name": it.name,
                "is_active": bool(it.is_active),
                "category_id": it.category_id,
                "business_id": it.business_id,
                "price": str(price_effective),           # compat: UI usa item.price
                "price_base": str(price_base),
                "price_effective": str(price_effective),
                "has_override": bool(ov),
                "branch_id": branch_id,                  # por claridad del response
            }
        )

    return {
        "category_id": category_id,
        "category_name": category.name,
        "business_id": business_id,
        "branch_id": branch_id,
        "items": out,
    }, 200


@item_bp.post("/category/<int:category_id>")
@jwt_required()
def create_item_for_category(category_id: int):
    business_id, err = _require_business_admin()
    if err:
        return err

    category = Category.query.get(category_id)
    if not category:
        return {"message": "Category not found"}, 404

    data = request.get_json(silent=True) or {}

    name = (data.get("name") or "").strip()
    price_raw = data.get("price", None)
    is_active = data.get("is_active", True)

    if not name:
        return {"message": "name is required"}, 400
    if price_raw is None or str(price_raw).strip() == "":
        return {"message": "price is required"}, 400

    try:
        price = Decimal(str(price_raw))
    except (InvalidOperation, ValueError):
        return {"message": "price must be a valid number"}, 400

    item = Item(
        name=name,
        price=price,
        is_active=bool(is_active),
        category_id=category_id,
        business_id=business_id,
    )

    try:
        db.session.add(item)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return {"message": "Item already exists in this category for this business"}, 409

    return {
        "message": "Item created",
        "item": {
            "id": item.id,
            "name": item.name,
            "price": str(item.price),
            "is_active": bool(item.is_active),
            "category_id": item.category_id,
            "business_id": item.business_id,
        },
    }, 201


@item_bp.get("/<int:item_id>")
@jwt_required()
def get_item(item_id: int):
    business_id, err = _require_business_admin()
    if err:
        return err

    item = Item.query.get(item_id)
    if not item:
        return {"message": "Item not found"}, 404
    if item.business_id != business_id:
        return {"message": "Forbidden"}, 403

    return {
        "item": {
            "id": item.id,
            "name": item.name,
            "price": str(item.price),
            "is_active": bool(item.is_active),
            "category_id": item.category_id,
            "business_id": item.business_id,
        }
    }, 200


@item_bp.put("/<int:item_id>")
@jwt_required()
def update_item(item_id: int):
    business_id, err = _require_business_admin()
    if err:
        return err

    item = Item.query.get(item_id)
    if not item:
        return {"message": "Item not found"}, 404
    if item.business_id != business_id:
        return {"message": "Forbidden"}, 403

    data = request.get_json(silent=True) or {}

    if "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            return {"message": "name cannot be empty"}, 400
        item.name = name

    if "price" in data:
        price_raw = data.get("price", None)
        if price_raw is None or str(price_raw).strip() == "":
            return {"message": "price cannot be empty"}, 400
        try:
            item.price = Decimal(str(price_raw))
        except (InvalidOperation, ValueError):
            return {"message": "price must be a valid number"}, 400

    if "is_active" in data:
        item.is_active = bool(data.get("is_active"))

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return {"message": "Item with that name already exists in this category for this business"}, 409

    return {
        "message": "Item updated",
        "item": {
            "id": item.id,
            "name": item.name,
            "price": str(item.price),
            "is_active": bool(item.is_active),
            "category_id": item.category_id,
            "business_id": item.business_id,
        },
    }, 200


@item_bp.delete("/<int:item_id>")
@jwt_required()
def delete_item(item_id: int):
    business_id, err = _require_business_admin()
    if err:
        return err

    item = Item.query.get(item_id)
    if not item:
        return {"message": "Item not found"}, 404
    if item.business_id != business_id:
        return {"message": "Forbidden"}, 403

    db.session.delete(item)
    db.session.commit()

    return {"message": "Item deleted"}, 200
