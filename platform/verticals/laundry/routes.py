from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime

from core.database import get_db
from core.dependencies import get_current_claims, require_business_admin
from core.models.tenant import Branch
from verticals.laundry.models import Order, OrderItem, OrderGarmentTicket, Item, Category, Service, Color, Print, Defect
from verticals.laundry.schemas import OrderCreate, OrderStatusUpdate, OrderPaymentIn, GarmentScanIn, CarouselAssignIn, ItemCreate, ItemUpdate, CategoryCreate, ServiceCreate
from verticals.laundry.services import create_order
from core.models.payment import OrderPayment

router = APIRouter(prefix="/laundry", tags=["laundry"])


@router.post("/orders", status_code=201)
def post_order(payload: dict, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    order = create_order(db, payload, claims)
    return {"message": "Orden creada.", "order": order.to_dict()}


@router.get("/orders")
def list_orders(
    branch_id: Optional[int] = None,
    client_id: Optional[int] = None,
    status: Optional[str] = None,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    q = db.query(Order)
    if not claims.get("is_super_admin"):
        bid = claims.get("branch_id") or claims.get("active_branch_id")
        if bid:
            q = q.filter(Order.branch_id == bid)
        else:
            biz_id = claims.get("business_id")
            branch_ids = [b.id for b in db.query(Branch).filter_by(business_id=biz_id).all()]
            q = q.filter(Order.branch_id.in_(branch_ids))
    if branch_id:
        q = q.filter(Order.branch_id == branch_id)
    if client_id:
        q = q.filter(Order.client_id == client_id)
    if status:
        q = q.filter(Order.status == status)
    orders = q.order_by(Order.order_date.desc()).limit(200).all()
    return {"orders": [o.to_dict() for o in orders]}


@router.get("/orders/{order_id}")
def get_order(order_id: int, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada.")
    return order.to_dict()


@router.patch("/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada.")

    if payload.status == "Listo" and order.status not in ("Listo",):
        branch = db.query(Branch).filter(Branch.id == order.branch_id).first()
        db.refresh(branch)
        require_scan = branch.require_scan if branch.require_scan is not None else True
        if require_scan:
            unscanned = [t for t in order.garment_tickets if not t.scanned_at]
            if unscanned:
                raise HTTPException(
                    status_code=400,
                    detail=f"Faltan {len(unscanned)} prendas por escanear."
                )

    if payload.status == "Entregada":
        order.delivered_at = datetime.utcnow()
    order.status = payload.status
    if payload.notes:
        order.notes = payload.notes
    db.commit()
    return order.to_dict()


@router.post("/orders/{order_id}/payments", status_code=201)
def add_payment(
    order_id: int,
    payload: OrderPaymentIn,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada.")
    payment = OrderPayment(order_id=order_id, method=payload.method, amount=payload.amount, reference=payload.reference)
    db.add(payment)
    total_paid = sum(float(p.amount) for p in order.payments) + float(payload.amount)
    if total_paid >= float(order.total_amount):
        order.payment_status = "paid"
        order.amount_paid = order.total_amount
    else:
        order.payment_status = "partial"
        order.amount_paid = total_paid
    db.commit()
    return order.to_dict()


@router.post("/orders/{order_id}/scan-garment")
def scan_garment(
    order_id: int,
    payload: GarmentScanIn,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada.")
    ticket = db.query(OrderGarmentTicket).filter(
        OrderGarmentTicket.order_id == order_id,
        OrderGarmentTicket.ticket_number == payload.ticket_number,
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado en esta orden.")
    ticket.scanned_at = datetime.utcnow()
    db.commit()
    total = len(order.garment_tickets)
    scanned = len([t for t in order.garment_tickets if t.scanned_at])
    return {"scanned": scanned, "total": total, "all_scanned": scanned == total}


@router.post("/orders/{order_id}/assign-carousel")
def assign_carousel(
    order_id: int,
    payload: CarouselAssignIn,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada.")
    order.carousel_position = payload.position
    order.status = "Listo"
    db.commit()
    return order.to_dict()


@router.post("/orders/{order_id}/deliver")
def deliver_order(order_id: int, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada.")
    order.status = "Entregada"
    order.delivered_at = datetime.utcnow()
    db.commit()
    return order.to_dict()


@router.get("/orders/stats")
def order_stats(
    branch_id: Optional[int] = None,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    effective_branch = branch_id or claims.get("branch_id") or claims.get("active_branch_id")
    q = db.query(Order)
    if effective_branch:
        q = q.filter(Order.branch_id == effective_branch)
    elif claims.get("business_id"):
        biz_id = claims.get("business_id")
        branch_ids = [b.id for b in db.query(Branch).filter_by(business_id=biz_id).all()]
        q = q.filter(Order.branch_id.in_(branch_ids))
    orders = q.all()
    status_counts = {}
    for o in orders:
        status_counts[o.status] = status_counts.get(o.status, 0) + 1
    return {"status_counts": status_counts, "total": len(orders)}


@router.get("/services")
def list_services(db: Session = Depends(get_db)):
    services = db.query(Service).all()
    return [s.to_dict() for s in services]


@router.post("/services", status_code=201)
def create_service(
    payload: ServiceCreate,
    claims: dict = Depends(require_business_admin),
    db: Session = Depends(get_db),
):
    service = Service(name=payload.name)
    db.add(service)
    db.commit()
    db.refresh(service)
    return service.to_dict()


@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    return [c.to_dict() for c in db.query(Category).all()]


@router.post("/categories", status_code=201)
def create_category(
    payload: CategoryCreate,
    claims: dict = Depends(require_business_admin),
    db: Session = Depends(get_db),
):
    cat = Category(name=payload.name, service_id=payload.service_id)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat.to_dict()


@router.get("/items")
def list_items(
    business_id: Optional[int] = None,
    category_id: Optional[int] = None,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    biz_id = business_id or claims.get("business_id")
    q = db.query(Item).filter((Item.business_id == biz_id) | (Item.business_id.is_(None)))
    if category_id:
        q = q.filter(Item.category_id == category_id)
    return [i.to_dict() for i in q.all()]


@router.post("/items", status_code=201)
def create_item(
    payload: ItemCreate,
    claims: dict = Depends(require_business_admin),
    db: Session = Depends(get_db),
):
    item = Item(
        name=payload.name, price=payload.price, units=payload.units,
        description=payload.description, category_id=payload.category_id,
        business_id=payload.business_id or claims.get("business_id"),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item.to_dict()


@router.put("/items/{item_id}")
def update_item(
    item_id: int,
    payload: ItemUpdate,
    claims: dict = Depends(require_business_admin),
    db: Session = Depends(get_db),
):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Artículo no encontrado.")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(item, field, value)
    db.commit()
    return item.to_dict()


@router.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: int, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Artículo no encontrado.")
    db.delete(item)
    db.commit()
