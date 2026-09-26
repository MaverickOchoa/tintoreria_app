from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime

from core.database import get_db
from core.dependencies import get_current_claims
from core.utils.push import dispatch_event
from core.dependencies import require_business_admin
from core.models.tenant import Branch
from core.models.client import Client
from verticals.laundry.models import Order, OrderItem, OrderGarmentTicket, Item, Category, Service, Color, Print, Defect
from verticals.laundry.schemas import OrderCreate, OrderStatusUpdate, OrderPaymentIn, GarmentScanIn, CarouselAssignIn, ItemCreate, ItemUpdate, CategoryCreate, ServiceCreate, ColorCreate, PrintCreate, DefectCreate
from verticals.laundry.services import create_order
from core.models.payment import OrderPayment

router = APIRouter(tags=["laundry"])


@router.post("/orders", status_code=201)
def post_order(payload: dict, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    order = create_order(db, payload, claims)
    return {"message": "Orden creada.", "order": order.to_dict()}


def _auto_advance_orders(orders, db: Session):
    now = datetime.utcnow()
    changed = False
    for o in orders:
        if o.status == "Creada" and o.order_date and (now - o.order_date).total_seconds() >= 7200:
            o.status = "En proceso"
            changed = True
    if changed:
        db.commit()

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
    _auto_advance_orders(orders, db)
    return {"orders": [o.to_dict() for o in orders]}


@router.get("/orders/stats")
def order_stats(
    branch_id: Optional[int] = None,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    effective_branch = branch_id or claims.get("branch_id") or claims.get("active_branch_id")
    q = db.query(Order).filter(Order.status.notin_(["Entregado", "Cancelado"]))
    if effective_branch:
        q = q.filter(Order.branch_id == effective_branch)
    elif claims.get("business_id"):
        biz_id = claims.get("business_id")
        branch_ids = [b.id for b in db.query(Branch).filter_by(business_id=biz_id).all()]
        q = q.filter(Order.branch_id.in_(branch_ids))
    orders = q.all()
    
    from datetime import datetime, timedelta
    now_date = datetime.utcnow().date()
    
    stats = {
        "overdue": 0,
        "today_normal": 0,
        "today_urgent": 0,
        "today_extra": 0,
        "past_30": 0,
        "past_60": 0,
        "past_90": 0,
    }
    
    for o in orders:
        if not o.delivery_date:
            continue
        
        if isinstance(o.delivery_date, datetime):
            dd = o.delivery_date.date()
        elif isinstance(o.delivery_date, str):
            try:
                dd = datetime.fromisoformat(o.delivery_date.replace("Z", "")).date()
            except Exception:
                continue
        else:
            try:
                dd = o.delivery_date.date()
            except Exception:
                dd = o.delivery_date
        
        if type(dd) != type(now_date):
            continue
            
        if dd < now_date:
            stats["overdue"] += 1
            days_past = (now_date - dd).days
            if days_past >= 90:
                stats["past_90"] += 1
            elif days_past >= 60:
                stats["past_60"] += 1
            elif days_past >= 30:
                stats["past_30"] += 1
        elif dd == now_date:
            urg = o.urgency or "normal"
            if urg == "normal": stats["today_normal"] += 1
            elif urg == "urgent": stats["today_urgent"] += 1
            elif urg == "extra_urgent": stats["today_extra"] += 1

    return stats

@router.get("/orders/{order_id}")
def get_order(order_id: int, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada.")
    _auto_advance_orders([order], db)
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

    old_status = order.status
    if payload.status == "Entregada":
        order.delivered_at = datetime.utcnow()
    order.status = payload.status
    if payload.notes:
        order.notes = payload.notes
    db.commit()

    if payload.status == "Listo" and old_status != "Listo":
        from core.models.client import Client, ClientType
        from core.utils.push import dispatch_event
        client = db.query(Client).filter(Client.id == order.client_id).first() if order.client_id else None
        if client and branch:
            # 1. Dispatch order ready
            dispatch_event(db, "order_ready", branch.business_id, client, {"folio": order.folio or str(order.id)})
            
            # 2. Check for recurring client (3rd order completed)
            completed_orders = db.query(Order).filter(Order.client_id == client.id, Order.status.in_(["Listo", "Entregada"])).count()
            if completed_orders == 3:
                dispatch_event(db, "client_recurring", branch.business_id, client)
            if completed_orders >= 3:
                from sqlalchemy import func
                recurring_type = db.query(ClientType).filter(
                    ClientType.business_id == branch.business_id,
                    func.lower(ClientType.name).in_(["frecuente", "recurrente"])
                ).first()
                if recurring_type and client.client_type_id != recurring_type.id:
                    client.client_type_id = recurring_type.id
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
        
    points_used = 0.0
    if payload.method == "points":
        # Usually points amount = points_used since 1 peso = 1 point in redemption,
        # but to be perfectly safe, we deduct the monetary amount from points_balance.
        points_used = float(payload.amount)
        
    payment = OrderPayment(order_id=order_id, method=payload.method, amount=payload.amount, reference=payload.reference, points_used=points_used)
    db.add(payment)
    
    if points_used > 0:
        client = db.query(Client).filter(Client.id == order.client_id).first()
        if client:
            client.points_balance = max(0, (client.points_balance or 0) - points_used)
            
    total_paid = sum(float(p.amount) for p in order.payments) + float(payload.amount)
    
    # Do we award points if it's fully paid now?
    # NO: The user explicitly said: "si pagan con puntos ya no generan puntos".
    # Since OrderPaymentIn is just a single payment, we can check if the order has ANY points payments.
    
    if total_paid >= float(order.total_amount):
        order.payment_status = "paid"
        order.amount_paid = order.total_amount
        
        # Check if points were used in any payment for this order
        used_points_in_order = any(p.points_used > 0 for p in order.payments) or (points_used > 0)
        if not used_points_in_order:
            branch = db.query(Branch).filter(Branch.id == order.branch_id).first()
            if branch and branch.payment_points:
                client = db.query(Client).filter(Client.id == order.client_id).first()
                if client:
                    client.points_balance = (client.points_balance or 0) + round(float(order.total_amount) * branch.points_per_peso, 2)
    else:
        order.payment_status = "partial"
        order.amount_paid = total_paid
    db.commit()
    return order.to_dict()



@router.get("/orders/by-folio/{folio}")
def get_order_by_folio(folio: str, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    branch_id = int(claims.get("active_branch_id") or claims.get("branch_id") or 0)
    q = db.query(Order).filter(Order.folio == folio)
    if branch_id:
        q = q.filter(Order.branch_id == branch_id)
    order = q.first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    _auto_advance_orders([order], db)
    
    # Check permissions (super admin or same business)
    if not claims.get("is_super_admin"):
        branch = db.query(Branch).filter(Branch.id == order.branch_id).first()
        if not branch or branch.business_id != claims.get("business_id"):
            raise HTTPException(status_code=403, detail="Acceso denegado a esta orden")
            
    # Auto-update status to 'En Producción' if it's 'Pendiente' or 'Creada'
    if order.status in ('Creada', 'Pendiente'):
        order.status = 'En Producción'
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
        OrderGarmentTicket.ticket_code == payload.ticket_code,
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado en esta orden.")
    ticket.scanned_at = datetime.utcnow()
    ticket.scanned = True
    db.commit()
    db.refresh(order)
    return {"message": "Ticket escaneado", "tickets": [t.to_dict() for t in order.garment_tickets]}


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
    order.carousel_position = payload.carousel_position
    order.status = "Listo"
    db.commit()
    
    # Try sending Push Notification
    client = db.query(Client).filter(Client.id == order.client_id).first()
    branch = db.query(Branch).filter(Branch.id == order.branch_id).first()
    if client and branch:
        from core.utils.push import dispatch_event
        dispatch_event(db, "order_ready", branch.business_id, client, {"folio": order.folio or str(order.id)})

    db.refresh(order)
    return {"message": "Posición asignada", "order": order.to_dict()}


from verticals.laundry.schemas import OrderDeliverIn
from core.models.payment import OrderPayment
from core.models.client import Client

@router.post("/orders/{order_id}/deliver")
def deliver_order(order_id: int, payload: OrderDeliverIn, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada.")
    if order.status == "Entregado":
        raise HTTPException(status_code=400, detail="Esta orden ya fue entregada")
    if order.status == "Cancelado":
        raise HTTPException(status_code=400, detail="No se puede entregar una orden cancelada")
    
    total = float(order.total_amount)
    prev_paid = float(order.amount_paid)
    remaining = round(total - prev_paid, 2)
    new_paid = round(sum(p.amount for p in payload.payments), 2)
    
    if remaining > 0 and new_paid < remaining:
        raise HTTPException(status_code=400, detail=f"Saldo pendiente: ${remaining}. Debe liquidarse completo para entregar")
        
    client = db.query(Client).filter(Client.id == order.client_id).first()
    total_points_used = 0.0
    
    for p in payload.payments:
        db.add(OrderPayment(
            order_id=order.id,
            method=p.method,
            amount=p.amount,
            points_used=p.points_used or 0.0
        ))
        total_points_used += float(p.points_used or 0.0)
        
    if total_points_used > 0 and client:
        client.points_balance = max(0, (client.points_balance or 0) - total_points_used)
        
    order.payment_status = "paid"
    order.amount_paid = total
    order.status = "Entregado"
    order.delivered_at = datetime.utcnow()
    db.commit()
    return order.to_dict()





@router.get("/services")
def list_services(db: Session = Depends(get_db)):
    from verticals.laundry.models import Service
    services = db.query(Service).all()
    return {"services": [s.to_dict() for s in services]}


from core.dependencies import require_super_admin

@router.post("/services", status_code=201)
def create_service(
    payload: ServiceCreate,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    # Check if exists
    existing = db.query(Service).filter(func.lower(Service.name) == payload.name.lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="El servicio ya existe.")
        
    service = Service(name=payload.name)
    try:
        db.add(service)
        db.commit()
        db.refresh(service)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
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


@router.put("/categories/{category_id}")
def update_category(category_id: int, payload: CategoryCreate, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category no encontrada")
    cat.name = payload.name
    db.commit()
    db.refresh(cat)
    return cat.to_dict()

@router.delete("/categories/{category_id}")
def delete_category(category_id: int, claims: dict = Depends(require_business_admin), db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category no encontrada")
    try:
        db.delete(cat)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="No se puede eliminar la categoría porque hay ítems que la usan.")
    return {"message": "Categoría eliminada"}

@router.put("/services/{service_id}")
def update_service(service_id: int, payload: ServiceCreate, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    srv = db.query(Service).filter(Service.id == service_id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Service no encontrado")
    srv.name = payload.name
    srv.price_modifier = payload.price_modifier
    db.commit()
    db.refresh(srv)
    return srv.to_dict()

@router.delete("/services/{service_id}")
def delete_service(service_id: int, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    srv = db.query(Service).filter(Service.id == service_id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Service no encontrado")
    try:
        db.delete(srv)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="No se puede eliminar el servicio porque hay órdenes que lo usan.")
    return {"message": "Servicio eliminado"}

# -------------------- DETAILS (COLORS, PRINTS, DEFECTS) --------------------

@router.get("/colors")
def list_colors(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    colors = db.query(Color).all()
    return {"colors": [c.to_dict() for c in colors]}

@router.post("/colors")
def create_color(payload: ColorCreate, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    c = Color(name=payload.name)
    if hasattr(payload, 'hex_code') and payload.hex_code:
        c.hex_code = payload.hex_code
    db.add(c)
    db.commit()
    db.refresh(c)
    return c.to_dict()

@router.put("/colors/{id}")
def update_color(id: int, payload: ColorCreate, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    c = db.query(Color).filter(Color.id == id).first()
    if not c: raise HTTPException(status_code=404)
    c.name = payload.name
    if hasattr(payload, 'hex_code') and payload.hex_code:
        c.hex_code = payload.hex_code
    db.commit()
    return c.to_dict()

@router.delete("/colors/{id}")
def delete_color(id: int, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    c = db.query(Color).filter(Color.id == id).first()
    if not c: raise HTTPException(status_code=404)
    db.delete(c)
    db.commit()
    return {"message": "Deleted"}

@router.get("/prints")
def list_prints(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    prints = db.query(Print).all()
    return {"prints": [p.to_dict() for p in prints]}

@router.post("/prints")
def create_print(payload: PrintCreate, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    p = Print(name=payload.name)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p.to_dict()

@router.put("/prints/{id}")
def update_print(id: int, payload: PrintCreate, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    p = db.query(Print).filter(Print.id == id).first()
    if not p: raise HTTPException(status_code=404)
    p.name = payload.name
    db.commit()
    return p.to_dict()

@router.delete("/prints/{id}")
def delete_print(id: int, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    p = db.query(Print).filter(Print.id == id).first()
    if not p: raise HTTPException(status_code=404)
    db.delete(p)
    db.commit()
    return {"message": "Deleted"}

@router.get("/defects")
def list_defects(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    defects = db.query(Defect).all()
    return {"defects": [d.to_dict() for d in defects]}

@router.post("/defects")
def create_defect(payload: DefectCreate, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    d = Defect(name=payload.name)
    db.add(d)
    db.commit()
    db.refresh(d)
    return d.to_dict()

@router.put("/defects/{id}")
def update_defect(id: int, payload: DefectCreate, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    d = db.query(Defect).filter(Defect.id == id).first()
    if not d: raise HTTPException(status_code=404)
    d.name = payload.name
    db.commit()
    return d.to_dict()

@router.delete("/defects/{id}")
def delete_defect(id: int, claims: dict = Depends(require_super_admin), db: Session = Depends(get_db)):
    d = db.query(Defect).filter(Defect.id == id).first()
    if not d: raise HTTPException(status_code=404)
    db.delete(d)
    db.commit()
    return {"message": "Deleted"}

@router.get("/seed_all_data")
def seed_all_data(db: Session = Depends(get_db)):
    from verticals.laundry.models import Service, Category, Color, Print, Defect
    try:
        services_data = ["Tintorería", "Planchado", "Sastrería", "Miscelánea"]
        svc_objs = {}
        for s_name in services_data:
            svc = db.query(Service).filter(Service.name == s_name).first()
            if not svc:
                svc = Service(name=s_name)
                db.add(svc)
                db.commit()
                db.refresh(svc)
            svc_objs[s_name] = svc

        cats_data = [
            ("Trajes", "Tintorería"),
            ("Camisas", "Planchado"),
            ("Vestidos", "Tintorería"),
            ("Pantalones", "Planchado")
        ]
        for c_name, s_name in cats_data:
            svc = svc_objs[s_name]
            cat = db.query(Category).filter(Category.name == c_name, Category.service_id == svc.id).first()
            if not cat:
                cat = Category(name=c_name, service_id=svc.id)
                db.add(cat)
                db.commit()

        colors_data = ['Rojo', 'Negro', 'Blanco', 'Gris Oxford', 'Gris', 'Gris Claro', 'Cafe', 'Cafe Claro', 'Cafe Obscuro', 'Azul', 'Azul Cielo', 'Azul Claro', 'Azul Rey', 'Azul Marino', 'Lila', 'Morado', 'Mora', 'Verde', 'Verde Pistache', 'Verde Claro', 'Verde Seco', 'Verde Militar', 'Verde Limon', 'Verde Agua', 'Hueso', 'Crema', 'Naranja', 'Rojo Ladrillo', 'Shedron', 'Guinda', 'Vino', 'Rosa', 'Palo De Rosa', 'Durazno', 'Melon', 'Coral', 'Fiusha', 'Amarillo', 'Amarillo Palido', 'Mostaza', 'Varios Colores', 'Dorado', 'Plateado', 'Beige', 'Amarillo Oscuro']
        for c_name in colors_data:
            if not db.query(Color).filter(Color.name == c_name).first():
                db.add(Color(name=c_name))
                db.commit()

        prints_data = ['Liso', 'Bolitas', 'Rayas', 'Gales', 'Encaje', 'Flores', 'Jaspeado', 'Tejido', 'Cuadros', 'Dos Todos', 'Palmas', 'Cuadro Chico', 'Cuadro Grande', 'Rombos', 'Panel', 'Moscata']
        for p_name in prints_data:
            if not db.query(Print).filter(Print.name == p_name).first():
                db.add(Print(name=p_name))
                db.commit()

        defects_data = ['Quemado', 'Manchado', 'Sin Raya', 'Boton Roto', 'Falta Boton', 'Luido', 'Color Corrido', 'Agujerado', 'Tela Abierta', 'Brillado', 'Encogido', 'Llorado', 'Percudido', 'Rasgado', 'Hilo Jalado', 'Adornos Maltratados', 'Tela Pelada', 'Quebrado', 'Bajo Riesgo Del Cliente', 'Sin Garantia']
        for d_name in defects_data:
            if not db.query(Defect).filter(Defect.name == d_name).first():
                db.add(Defect(name=d_name))
                db.commit()
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}
    return {"message": "Data seeded successfully!"}




@router.get("/debug/orders/stats")
def debug_order_stats(branch_id: int = None, db: Session = Depends(get_db)):
    q = db.query(Order).filter(Order.status.notin_(["Entregado", "Cancelado"]))
    if branch_id:
        q = q.filter(Order.branch_id == branch_id)
    orders = q.all()
    
    from datetime import datetime, timedelta
    now_date = datetime.utcnow().date()
    
    stats = {
        "overdue": 0,
        "today_normal": 0,
        "today_urgent": 0,
        "today_extra": 0,
        "past_30": 0,
        "past_60": 0,
        "past_90": 0,
        "debug_count": len(orders),
        "debug_types": []
    }
    
    for o in orders:
        if not o.delivery_date:
            continue
        
        if isinstance(o.delivery_date, datetime):
            dd = o.delivery_date.date()
        elif isinstance(o.delivery_date, str):
            try:
                dd = datetime.fromisoformat(o.delivery_date.replace("Z", "")).date()
            except Exception:
                continue
        else:
            try:
                dd = o.delivery_date.date()
            except Exception:
                dd = o.delivery_date
                
        stats["debug_types"].append({"id": o.id, "dd": str(dd), "urgency": o.urgency})
        
        if type(dd) != type(now_date):
            continue
            
        if dd < now_date:
            stats["overdue"] += 1
            days_past = (now_date - dd).days
            if days_past >= 90:
                stats["past_90"] += 1
            elif days_past >= 60:
                stats["past_60"] += 1
            elif days_past >= 30:
                stats["past_30"] += 1
        elif dd == now_date:
            urg = (o.urgency or "normal").lower()
            if urg == "normal": stats["today_normal"] += 1
            elif urg == "urgent": stats["today_urgent"] += 1
            elif urg == "extra_urgent": stats["today_extra"] += 1

    return stats
