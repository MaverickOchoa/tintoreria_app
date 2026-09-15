from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException

from verticals.laundry.models import Order, OrderItem, OrderGarmentTicket, Item
from core.models.client import Client
from core.models.tenant import Branch, Business, BusinessHour, BusinessHoliday
from core.models.payment import OrderPayment


def calculate_delivery_date(db: Session, business_id: int, from_dt: datetime, working_days: int) -> datetime:
    if working_days == 0:
        return from_dt

    hours_map = {h.day_of_week: h for h in db.query(BusinessHour).filter_by(business_id=business_id).all()}
    holidays = db.query(BusinessHoliday).filter_by(business_id=business_id, is_active=True).all()

    def is_holiday(d):
        for h in holidays:
            if h.is_recurring and h.month == d.month and h.day == d.day:
                return True
            if not h.is_recurring and h.specific_date == d:
                return True
        return False

    current = from_dt.date() if isinstance(from_dt, datetime) else from_dt
    days_added = 0
    while days_added < working_days:
        current += timedelta(days=1)
        dow = current.weekday()
        bh = hours_map.get(dow)
        if bh is None:
            if dow == 6:
                continue
        else:
            if not bh.is_open:
                continue
        if is_holiday(current):
            continue
        days_added += 1

    from datetime import time as dt_time
    bh = hours_map.get(current.weekday())
    close = bh.close_time if bh and bh.close_time else dt_time(18, 0)
    return datetime.combine(current, close)


def create_order(db: Session, data: dict, claims: dict) -> Order:
    client_id = data.get("client_id")
    items_data = data.get("items", [])
    payments_data = data.get("payments", [])
    urgency = data.get("urgency", "normal")
    notes = data.get("notes", "")
    discount_amount = float(data.get("discount_amount", 0))
    promo_discount = float(data.get("promo_discount", 0))
    total_discount = round(discount_amount + promo_discount, 2)
    delivery_date_override = data.get("delivery_date")
    is_deferred = data.get("is_deferred", False)

    if not client_id:
        raise HTTPException(status_code=400, detail="client_id es requerido.")
    if not items_data:
        raise HTTPException(status_code=400, detail="La orden debe tener al menos un artículo.")

    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado.")

    branch_id = int(claims.get("branch_id") or claims.get("active_branch_id") or data.get("branch_id") or 0)
    if not branch_id:
        raise HTTPException(status_code=400, detail="No se determinó sucursal.")

    emp_id = claims.get("employee_id")
    if not emp_id:
        from core.models.user import Employee
        emp = db.query(Employee).filter_by(branch_id=branch_id).first()
        emp_id = emp.id if emp else None
    if not emp_id:
        raise HTTPException(status_code=400, detail="No se encontró empleado para esta sucursal.")

    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    business = db.query(Business).filter(Business.id == branch.business_id).first() if branch else None

    if delivery_date_override:
        try:
            delivery_dt = datetime.fromisoformat(delivery_date_override.replace("Z", ""))
        except Exception:
            delivery_dt = None
    else:
        if business:
            days_map = {"normal": business.normal_days, "urgent": business.urgent_days, "extra_urgent": business.extra_urgent_days}
            days = days_map.get(urgency, business.normal_days)
        else:
            days = {"normal": 3, "urgent": 1, "extra_urgent": 0}.get(urgency, 3)
        delivery_dt = calculate_delivery_date(db, business.id if business else 0, datetime.utcnow(), days)

    subtotal = sum(float(i["unit_price"]) * int(i["quantity"]) for i in items_data)
    branch_cfg = branch.get_config() if branch else {}
    if not branch_cfg.get("discount_enabled", True):
        total_discount = 0.0

    taxable = max(0, subtotal - total_discount)
    uses_iva = branch_cfg.get("uses_iva", business.uses_iva if business else True)
    tax = round(taxable * 0.16, 2) if uses_iva else 0.0
    total = round(taxable + tax, 2)

    total_paid = round(sum(float(p["amount"]) for p in payments_data), 2)
    if is_deferred:
        payment_status, amount_paid = "pending", 0.0
    elif total_paid >= total:
        payment_status, amount_paid = "paid", total
    elif total_paid > 0:
        payment_status, amount_paid = "partial", total_paid
    else:
        payment_status, amount_paid = "pending", 0.0

    created_by_name = claims.get("full_name") or claims.get("sub", "")

    new_order = Order(
        client_id=client_id, branch_id=branch_id, employee_id=emp_id,
        notes=notes, subtotal=round(subtotal, 2), discount=total_discount,
        tax=tax, total_amount=total, payment_status=payment_status,
        amount_paid=amount_paid, urgency=urgency, delivery_date=delivery_dt,
        created_by_name=created_by_name,
    )
    db.add(new_order)
    db.flush()

    for i in items_data:
        item_id = i.get("item_id") or i.get("product_service_id")
        line_total = round(float(i["unit_price"]) * int(i["quantity"]), 2)
        db.add(OrderItem(
            order_id=new_order.id, item_id=item_id,
            quantity=int(i["quantity"]), unit_price=float(i["unit_price"]),
            subtotal=line_total, notes=i.get("notes"),
            color=i.get("color"), brand=i.get("brand"), defects=i.get("defects"),
        ))

    for p in payments_data:
        db.add(OrderPayment(
            order_id=new_order.id, method=p["method"],
            amount=float(p["amount"]), reference=p.get("reference"),
        ))

    if branch:
        prefix = branch.folio_prefix or ""
        counter = (branch.folio_counter or 0) + 1
        branch.folio_counter = counter
        new_order.folio = f"{prefix}{str(counter).zfill(4)}" if prefix else str(counter).zfill(4)

    ticket_seq = 1
    for i in items_data:
        item_id = i.get("item_id") or i.get("product_service_id")
        item_obj = db.query(Item).filter(Item.id == item_id).first()
        item_name = item_obj.name if item_obj else "Prenda"
        units = item_obj.units if item_obj else 1
        total_tickets = int(i.get("quantity", 1)) * (units or 1)
        for _ in range(total_tickets):
            code = f"{new_order.folio}-{ticket_seq}"
            db.add(OrderGarmentTicket(
                order_id=new_order.id, ticket_number=code, item_name=item_name,
            ))
            ticket_seq += 1

    if branch_cfg.get("payment_points") and payment_status == "paid":
        ppp = branch_cfg.get("points_per_peso", 0)
        client.points_balance = (client.points_balance or 0) + round(total * ppp, 2)

    total_points_used = sum(float(p.get("points_used", 0)) for p in payments_data)
    if total_points_used > 0:
        client.points_balance = max(0, (client.points_balance or 0) - total_points_used)

    db.commit()
    db.refresh(new_order)
    return new_order
