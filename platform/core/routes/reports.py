from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from datetime import datetime, timedelta, date

from core.database import get_db
from core.dependencies import get_current_claims
from verticals.laundry.models import Order, OrderItem, Item
from core.models.tenant import Branch, Business
from core.models.client import Client
from core.models.promotion import Promotion
from core.models.expense import Expense
from core.models.payment import OrderPayment

router = APIRouter(tags=["reports"], prefix="/reports")

def _get_dates(date_from, date_to):
    now = datetime.utcnow()
    if not date_from: 
        date_from = now.replace(day=1).strftime('%Y-%m-%d')
    if not date_to: 
        date_to = now.strftime('%Y-%m-%d')
    dt_from = datetime.strptime(date_from, '%Y-%m-%d')
    dt_to = datetime.strptime(date_to, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
    return dt_from, dt_to

@router.get("/profitability")
def get_profitability(branch_id: int = None, date_from: str = None, date_to: str = None, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    try:
        business_id = claims.get('business_id')
        if not business_id and branch_id:
            br = db.query(Branch).filter(Branch.id == branch_id).first()
            business_id = br.business_id if br else None
        if not business_id:
            raise HTTPException(status_code=400, detail='No business context')

        branches = db.query(Branch).filter(Branch.business_id == business_id).all()
        branch_map = {b.id: b for b in branches}

        # Per-service aggregation
        service_stats = {}
        orders = db.query(Order).join(Branch, Branch.id == Order.branch_id).filter(Branch.business_id == business_id).all()

        for order in orders:
            branch = branch_map.get(order.branch_id)
            cpp = (branch.cost_per_point or 0) if branch else 0
            for oi in (order.order_items or []):
                item = oi.product_service
                if not item:
                    continue
                pts = item.cost_points if item.cost_points is not None else 1.0
                unit_cost = pts * cpp
                unit_price = float(oi.unit_price or item.price or 0)
                qty = oi.quantity or 1
                revenue = unit_price * qty
                cost = unit_cost * qty
                sid = item.id
                if sid not in service_stats:
                    service_stats[sid] = {
                        'item_id': sid,
                        'name': item.name,
                        'price': unit_price,
                        'cost_points': pts,
                        'unit_cost': round(unit_cost, 2),
                        'total_qty': 0,
                        'total_revenue': 0.0,
                        'total_cost': 0.0,
                    }
                service_stats[sid]['total_qty']     += qty
                service_stats[sid]['total_revenue'] += revenue
                service_stats[sid]['total_cost']    += cost

        result = []
        for s in service_stats.values():
            margin      = s['total_revenue'] - s['total_cost']
            margin_pct  = round((margin / s['total_revenue'] * 100), 1) if s['total_revenue'] else 0
            unit_margin = round(s['price'] - s['unit_cost'], 2)
            result.append({**s,
                'margin': round(margin, 2),
                'margin_pct': margin_pct,
                'unit_margin': unit_margin,
                'total_revenue': round(s['total_revenue'], 2),
                'total_cost': round(s['total_cost'], 2),
            })

        result.sort(key=lambda x: x['margin_pct'])  # worst first

        # Per-branch summary
        branch_summary = []
        for b in branches:
            b_orders = [o for o in orders if o.branch_id == b.id]
            cpp = b.cost_per_point or 0
            rev = cost = 0.0
            for o in b_orders:
                for oi in (o.order_items or []):
                    item = oi.product_service
                    if not item: continue
                    pts = item.cost_points if item.cost_points is not None else 1.0
                    qty = oi.quantity or 1
                    rev  += float(oi.unit_price or item.price or 0) * qty
                    cost += pts * cpp * qty
            branch_summary.append({
                'branch_id': b.id,
                'branch_name': b.name,
                'cost_per_point': cpp,
                'total_revenue': round(rev, 2),
                'total_cost': round(cost, 2),
                'total_margin': round(rev - cost, 2),
                'margin_pct': round((rev - cost) / rev * 100, 1) if rev else 0,
            })

        return {'services': result, 'branches': branch_summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/summary")
def get_summary(branch_id: int = None, date_from: str = None, date_to: str = None, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    try:
        business_id = claims.get('business_id')
        dt_from, dt_to = _get_dates(date_from, date_to)

        q = db.query(Order).join(Branch, Branch.id == Order.branch_id).filter(Branch.business_id == business_id, Order.order_date >= dt_from, Order.order_date <= dt_to)
        if branch_id: 
            q = q.filter(Order.branch_id == branch_id)

        orders = q.all()
        total_revenue = sum(float(o.total_amount) for o in orders)
        orders_count = len(orders)
        ticket_avg = round(total_revenue / orders_count, 2) if orders_count else 0
        completed = sum(1 for o in orders if o.status == 'Entregada')
        pending = sum(1 for o in orders if o.status not in ('Entregada',))

        statuses = {}
        for o in orders:
            statuses[o.status] = statuses.get(o.status, 0) + 1

        pay_q = (db.query(OrderPayment.method, func.sum(OrderPayment.amount))
            .join(Order, Order.id == OrderPayment.order_id)
            .join(Branch, Branch.id == Order.branch_id)
            .filter(Branch.business_id == business_id, Order.order_date >= dt_from, Order.order_date <= dt_to))
        if branch_id:
            pay_q = pay_q.filter(Order.branch_id == int(branch_id))
        payment_breakdown = {m: float(a or 0) for m, a in pay_q.group_by(OrderPayment.method).all()}

        total_collected = sum(float(o.amount_paid) for o in orders)
        total_pending_amt = sum(float(o.total_amount - o.amount_paid) for o in orders)
        return {
            'total_revenue': total_revenue,
            'orders_count': orders_count,
            'ticket_avg': ticket_avg,
            'completed': completed,
            'pending': pending,
            'total_collected': total_collected,
            'total_pending': total_pending_amt,
            'orders_by_status': statuses,
            'payment_breakdown': payment_breakdown,
            'date_from': dt_from.strftime('%Y-%m-%d'),
            'date_to': dt_to.strftime('%Y-%m-%d'),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/daily-trend")
def get_daily_trend(branch_id: int = None, date_from: str = None, date_to: str = None, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    try:
        business_id = claims.get('business_id')
        dt_from, dt_to = _get_dates(date_from, date_to)

        q = (db.query(
                func.date(Order.order_date).label('day'),
                func.sum(Order.total_amount).label('revenue'),
                func.count(Order.id).label('orders')
            )
            .join(Branch, Branch.id == Order.branch_id)
            .filter(Branch.business_id == business_id, Order.order_date >= dt_from, Order.order_date <= dt_to))
        if branch_id:
            q = q.filter(Order.branch_id == int(branch_id))
        rows = q.group_by(func.date(Order.order_date)).order_by(func.date(Order.order_date)).all()
        return [{'date': str(r.day), 'revenue': float(r.revenue or 0), 'orders': r.orders} for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/top-items")
def get_top_items(branch_id: int = None, date_from: str = None, date_to: str = None, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    try:
        business_id = claims.get('business_id')
        dt_from, dt_to = _get_dates(date_from, date_to)

        q = (db.query(
                OrderItem.product_service_id,
                func.sum(OrderItem.quantity).label('qty'),
            )
            .join(Order, Order.id == OrderItem.order_id)
            .join(Branch, Branch.id == Order.branch_id)
            .filter(Branch.business_id == business_id, Order.order_date >= dt_from, Order.order_date <= dt_to))
        if branch_id:
            q = q.filter(Order.branch_id == int(branch_id))
        rows = q.group_by(OrderItem.product_service_id).order_by(func.sum(OrderItem.quantity).desc()).limit(20).all()
        result = []
        for row in rows:
            item = db.query(Item).filter(Item.id == row.product_service_id).first()
            units = item.units if item else 1
            total_qty = int(row.qty or 0)
            total_pieces = total_qty * (units or 1)
            rev_row = db.query(func.sum(OrderItem.line_total)).filter(
                OrderItem.product_service_id == row.product_service_id,
                OrderItem.order_id.in_(
                    db.query(Order.id).join(Branch, Branch.id == Order.branch_id)
                    .filter(Branch.business_id == business_id, Order.order_date >= dt_from, Order.order_date <= dt_to)
                )
            ).scalar() or 0
            result.append({
                'item_id': row.product_service_id,
                'item_name': item.name if item else str(row.product_service_id),
                'total_qty': total_pieces,
                'total_revenue': float(rev_row),
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/by-branch")
def get_by_branch(branch_id: int = None, date_from: str = None, date_to: str = None, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    try:
        business_id = claims.get('business_id')
        dt_from, dt_to = _get_dates(date_from, date_to)

        rows = (db.query(
                    Order.branch_id,
                    func.sum(Order.total_amount).label('revenue'),
                    func.count(Order.id).label('orders')
                )
                .join(Branch, Branch.id == Order.branch_id)
                .filter(Branch.business_id == business_id, Order.order_date >= dt_from, Order.order_date <= dt_to)
                .group_by(Order.branch_id).all())

        result = []
        for r in rows:
            branch = db.query(Branch).filter(Branch.id == r.branch_id).first()
            delivered = db.query(Order).filter(
                Order.branch_id == r.branch_id,
                Order.status == 'Entregada',
                Order.order_date >= dt_from, Order.order_date <= dt_to
            ).count()
            rev = float(r.revenue or 0)
            cnt = int(r.orders or 0)
            result.append({
                'branch_id': r.branch_id,
                'branch_name': branch.name if branch else str(r.branch_id),
                'revenue': rev, 'orders': cnt,
                'avg_ticket': round(rev / cnt, 2) if cnt > 0 else 0,
                'delivered': delivered,
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/alerts")
def get_alerts(branch_id: int = None, date_from: str = None, date_to: str = None, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    try:
        business_id = claims.get('business_id')
        now = datetime.utcnow()
        alerts = []

        cutoff_48h = now - timedelta(hours=48)
        delay_q = db.query(Order).join(Branch, Branch.id == Order.branch_id).filter(
            Branch.business_id == business_id,
            Order.status.notin_(['Entregada']),
            Order.order_date <= cutoff_48h,
        )
        if branch_id:
            delay_q = delay_q.filter(Order.branch_id == int(branch_id))
        delayed_count = delay_q.count()
        if delayed_count > 0:
            alerts.append({'level': 'warning', 'message': f'{delayed_count} orden(es) con más de 48h sin entrega'})

        week_start = now - timedelta(days=7)
        four_weeks_ago = now - timedelta(days=28)
        exp_q = db.query(Expense.category, func.sum(Expense.total_cost).label('total'))
        if branch_id:
            exp_q = exp_q.filter(Expense.branch_id == int(branch_id))
        this_week = {r.category: float(r.total or 0) for r in
                     exp_q.filter(Expense.business_id == business_id,
                                  Expense.expense_date >= week_start.date()).group_by(Expense.category).all()}
        prev_weeks = {r.category: float(r.total or 0) for r in
                      exp_q.filter(Expense.business_id == business_id,
                                   Expense.expense_date >= four_weeks_ago.date(),
                                   Expense.expense_date < week_start.date()).group_by(Expense.category).all()}
        for cat, total in this_week.items():
            prev = prev_weeks.get(cat, 0)
            avg_prev = prev / 3 if prev > 0 else 0
            if avg_prev > 0 and total > avg_prev * 1.2:
                pct = round((total / avg_prev - 1) * 100)
                alerts.append({'level': 'error', 'message': f'Gasto en {cat} +{pct}% vs promedio de las últimas 3 semanas'})

        if not alerts:
            alerts.append({'level': 'success', 'message': 'Sin alertas — operación al día'})

        return {'alerts': alerts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/overview")
def get_overview(branch_id: int = None, date_from: str = None, date_to: str = None, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    try:
        business_id = claims.get('business_id')
        now = datetime.utcnow()
        today = now.date()
        month_start = today.replace(day=1)
        cutoff_48h = now - timedelta(hours=48)

        def _b(q):
            if branch_id:
                q = q.filter(Order.branch_id == int(branch_id))
            return q

        today_rev = float(_b(
            db.query(func.sum(Order.total_amount))
            .join(Branch, Branch.id == Order.branch_id)
            .filter(Branch.business_id == business_id, func.date(Order.order_date) == today)
        ).scalar() or 0)

        row = _b(
            db.query(func.sum(Order.total_amount), func.count(Order.id))
            .join(Branch, Branch.id == Order.branch_id)
            .filter(Branch.business_id == business_id, Order.order_date >= month_start)
        ).one()
        month_rev, month_count = float(row[0] or 0), int(row[1] or 0)

        active_count = _b(db.query(Order).join(Branch, Branch.id == Order.branch_id)
            .filter(Branch.business_id == business_id, Order.status.notin_(['Entregado', 'Cancelado']))).count()
        overdue_count = _b(db.query(Order).join(Branch, Branch.id == Order.branch_id)
            .filter(Branch.business_id == business_id, Order.status.notin_(['Entregado', 'Cancelado']),
                    Order.order_date <= cutoff_48h)).count()

        receivable = float(_b(
            db.query(func.sum(Order.total_amount - Order.amount_paid))
            .join(Branch, Branch.id == Order.branch_id)
            .filter(Branch.business_id == business_id, Order.payment_status != 'paid')
        ).scalar() or 0)

        top_row = _b(
            db.query(OrderItem.product_service_id, func.sum(OrderItem.quantity).label('qty'))
            .join(Order, Order.id == OrderItem.order_id)
            .join(Branch, Branch.id == Order.branch_id)
            .filter(Branch.business_id == business_id, Order.order_date >= month_start)
        ).group_by(OrderItem.product_service_id).order_by(func.sum(OrderItem.quantity).desc()).first()
        top_service = None
        if top_row:
            itm = db.query(Item).filter(Item.id == top_row.product_service_id).first()
            top_service = itm.name if itm else None

        funnel_statuses = ['Creada', 'En proceso', 'En Producción', 'Listo para posicionar', 'Listo', 'Entregado']
        funnel = []
        base_q = db.query(Order).join(Branch, Branch.id == Order.branch_id).filter(Branch.business_id == business_id)
        for st in funnel_statuses:
            cnt = _b(base_q.filter(Order.status == st)).count()
            if cnt > 0:
                funnel.append({'name': st, 'value': cnt})

        delivered = _b(base_q.filter(Order.status == 'Entregado')).count()
        in_process = _b(base_q.filter(Order.status.in_(['En proceso', 'En Producción', 'Listo para posicionar']))).count()
        ready = _b(base_q.filter(Order.status == 'Listo')).count()
        total_orders_count = _b(base_q).count()

        avg_cycle = _b(
            db.query(func.avg(
                func.extract('epoch', Order.delivered_at - Order.order_date) / 3600
            )).join(Branch, Branch.id == Order.branch_id)
            .filter(Branch.business_id == business_id, Order.delivered_at != None)
        ).scalar()

        svc_rows = _b(
            db.query(Item.name, func.count(OrderItem.id).label('orders'))
            .join(OrderItem, OrderItem.product_service_id == Item.id)
            .join(Order, Order.id == OrderItem.order_id)
            .join(Branch, Branch.id == Order.branch_id)
            .filter(Branch.business_id == business_id, Order.order_date >= month_start)
        ).group_by(Item.name).order_by(func.count(OrderItem.id).desc()).limit(8).all()

        return {
            'today_revenue': today_rev, 'month_revenue': month_rev,
            'month_count': month_count,
            'ticket_avg': month_rev / month_count if month_count > 0 else 0,
            'active_count': active_count, 'overdue_count': overdue_count,
            'receivable': receivable, 'top_service': top_service,
            'total_orders': total_orders_count,
            'in_process': in_process,
            'ready': ready,
            'delivered': delivered,
            'overdue': overdue_count,
            'avg_cycle_hours': round(float(avg_cycle), 1) if avg_cycle else None,
            'funnel': funnel,
            'by_service': [{'service': r.name, 'orders': r.orders} for r in svc_rows],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/receivable")
def get_receivable(branch_id: int = None, date_from: str = None, date_to: str = None, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    try:
        business_id = claims.get('business_id')
        now = datetime.utcnow()
        q = db.query(Order).join(Branch, Branch.id == Order.branch_id).filter(
            Branch.business_id == business_id,
            Order.payment_status != 'paid',
            Order.total_amount > Order.amount_paid,
        )
        if branch_id:
            q = q.filter(Order.branch_id == int(branch_id))
        orders = q.order_by(Order.order_date.asc()).limit(200).all()
        result = []
        total = 0
        for o in orders:
            balance = float(o.total_amount - o.amount_paid)
            days_old = (now - o.order_date).days
            client = db.query(Client).filter(Client.id == o.client_id).first()
            branch = db.query(Branch).filter(Branch.id == o.branch_id).first()
            result.append({
                'folio': o.folio or str(o.id),
                'client_name': f"{client.full_name} {client.last_name or ''}".strip() if client else '—',
                'client_phone': client.phone if client else '',
                'branch_name': branch.name if branch else '',
                'order_date': o.order_date.strftime('%Y-%m-%d'),
                'total_amount': float(o.total_amount),
                'amount_paid': float(o.amount_paid),
                'balance': balance, 'days_old': days_old, 'status': o.status,
            })
            total += balance
        aging = {
            'Hoy': sum(r['balance'] for r in result if r['days_old'] == 0),
            '1-7 días': sum(r['balance'] for r in result if 1 <= r['days_old'] <= 7),
            '8-30 días': sum(r['balance'] for r in result if 8 <= r['days_old'] <= 30),
            '+30 días': sum(r['balance'] for r in result if r['days_old'] > 30),
        }
        partial_orders = sum(1 for r in result if r['amount_paid'] > 0)
        total_all = db.query(func.count(Order.id)).join(Branch, Branch.id == Order.branch_id).filter(Branch.business_id == business_id).scalar() or 1
        total_paid = db.query(func.count(Order.id)).join(Branch, Branch.id == Order.branch_id).filter(Branch.business_id == business_id, Order.payment_status == 'paid').scalar() or 0
        pct = round(total_paid / total_all * 100, 1)
        return {
            'total_pending': total, 'pending_orders': len(result),
            'partial_orders': partial_orders, 'pct_paid_on_receive': pct,
            'aging': aging, 'pending_list': result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/clients-detail")
def get_clients_detail(branch_id: int = None, date_from: str = None, date_to: str = None, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    try:
        business_id = claims.get('business_id')
        dt_from, dt_to = _get_dates(date_from, date_to)
        now = datetime.utcnow()

        q = (db.query(Order.client_id,
                func.sum(Order.total_amount).label('total_spend'),
                func.count(Order.id).label('order_count'))
            .join(Branch, Branch.id == Order.branch_id)
            .filter(Branch.business_id == business_id,
                    Order.order_date >= dt_from, Order.order_date <= dt_to))
        if branch_id:
            q = q.filter(Order.branch_id == int(branch_id))
        rows = q.group_by(Order.client_id).order_by(func.sum(Order.total_amount).desc()).limit(10).all()
        top_clients_out = []
        all_client_ids = set()
        for r in rows:
            c = db.query(Client).filter(Client.id == r.client_id).first()
            if c:
                all_client_ids.add(r.client_id)
                top_clients_out.append({
                    'client_id': r.client_id,
                    'client_name': f"{c.full_name} {c.last_name or ''}".strip(),
                    'phone': c.phone,
                    'orders': int(r.order_count or 0),
                    'total': float(r.total_spend or 0),
                    'points': float(c.points_balance or 0),
                })

        total_in_period = (db.query(func.count(distinct(Order.client_id)))
            .join(Branch, Branch.id == Order.branch_id)
            .filter(Branch.business_id == business_id,
                    Order.order_date >= dt_from, Order.order_date <= dt_to)).scalar() or 0

        new_q = (db.query(func.count(distinct(Order.client_id)))
            .join(Branch, Branch.id == Order.branch_id)
            .filter(Branch.business_id == business_id,
                    Order.order_date >= dt_from, Order.order_date <= dt_to))
        if branch_id:
            new_q = new_q.filter(Order.branch_id == int(branch_id))
        all_ids_period = [r[0] for r in
            db.query(distinct(Order.client_id))
            .join(Branch, Branch.id == Order.branch_id)
            .filter(Branch.business_id == business_id,
                    Order.client_id != None,
                    Order.order_date >= dt_from, Order.order_date <= dt_to).all()]
        # "Returning" = client who has 2+ total orders in the business (regardless of period)
        # "New" = client who has only 1 order total in the business
        multi_order_ids = set(r[0] for r in
            db.query(Order.client_id)
            .join(Branch, Branch.id == Order.branch_id)
            .filter(Branch.business_id == business_id, Order.client_id != None)
            .group_by(Order.client_id)
            .having(func.count(Order.id) >= 2).all())
        returning = len([cid for cid in all_ids_period if cid in multi_order_ids])
        new_clients_count = len(all_ids_period) - returning

        avg_ticket_val = (db.query(func.avg(Order.total_amount))
            .join(Branch, Branch.id == Order.branch_id)
            .filter(Branch.business_id == business_id,
                    Order.order_date >= dt_from, Order.order_date <= dt_to)).scalar() or 0

        sixty_ago = (now - timedelta(days=60)).strftime('%Y-%m-%d')
        inactive_rows = (db.query(Order.client_id,
                func.max(Order.order_date).label('last_order'),
                func.count(Order.id).label('total_orders'))
            .join(Branch, Branch.id == Order.branch_id)
            .filter(Branch.business_id == business_id)
            .group_by(Order.client_id)
            .having(func.max(Order.order_date) < sixty_ago)
            .order_by(func.max(Order.order_date).asc())
            .limit(30).all())
        inactive_clients = []
        for r in inactive_rows:
            c = db.query(Client).filter(Client.id == r.client_id).first()
            if c:
                inactive_clients.append({
                    'client_id': r.client_id,
                    'client_name': f"{c.full_name} {c.last_name or ''}".strip(),
                    'phone': c.phone,
                    'last_order': r.last_order.strftime('%Y-%m-%d') if r.last_order else None,
                    'total_orders': int(r.total_orders or 0),
                })

        from datetime import date as ddate
        today_d = now.date()
        birthdays = []
        bday_clients = (db.query(Client)
            .join(Order, Order.client_id == Client.id)
            .join(Branch, Branch.id == Order.branch_id)
            .filter(Branch.business_id == business_id,
                    Client.date_of_birth_day != None,
                    Client.date_of_birth_month != None)
            .distinct()).all()
        for c in bday_clients:
            try:
                bday = ddate(today_d.year, c.date_of_birth_month, c.date_of_birth_day)
            except ValueError:
                continue
            days_until = (bday - today_d).days
            if days_until < 0:
                try:
                    bday = ddate(today_d.year + 1, c.date_of_birth_month, c.date_of_birth_day)
                    days_until = (bday - today_d).days
                except ValueError:
                    continue
            if 0 <= days_until <= 30:
                birthdays.append({'name': f"{c.full_name} {c.last_name or ''}".strip(),
                                  'phone': c.phone, 'days_until': days_until,
                                  'date': bday.strftime('%d/%m')})
        birthdays.sort(key=lambda x: x['days_until'])
        return {
            'new_clients': new_clients_count,
            'returning_clients': returning,
            'avg_ticket': float(avg_ticket_val),
            'top_clients': top_clients_out,
            'inactive_clients': inactive_clients,
            'upcoming_birthdays': birthdays[:10],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/discounts")
def get_discounts(branch_id: int = None, date_from: str = None, date_to: str = None, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    try:
        business_id = claims.get('business_id')
        dt_from, dt_to = _get_dates(date_from, date_to)
        
        q = db.query(Order).join(Branch, Branch.id == Order.branch_id).filter(
            Branch.business_id == business_id,
            Order.order_date >= dt_from, Order.order_date <= dt_to)
        if branch_id:
            q = q.filter(Order.branch_id == int(branch_id))
        orders = q.all()
        total_subtotal = sum(float(o.subtotal) for o in orders)
        total_discount = sum(float(o.discount) for o in orders)
        total_revenue = sum(float(o.total_amount) for o in orders)
        orders_with_discount = sum(1 for o in orders if float(o.discount) > 0)
        pts_q = (db.query(func.sum(OrderPayment.points_used))
            .join(Order, Order.id == OrderPayment.order_id)
            .join(Branch, Branch.id == Order.branch_id)
            .filter(Branch.business_id == business_id,
                    Order.order_date >= dt_from, Order.order_date <= dt_to,
                    OrderPayment.points_used > 0))
        if branch_id:
            pts_q = pts_q.filter(Order.branch_id == int(branch_id))
        total_points = float(pts_q.scalar() or 0)
        promos = db.query(Promotion).filter(Promotion.business_id == business_id, Promotion.active == True).all()
        by_promo = []
        for p in promos:
            p_orders = [o for o in orders if float(o.discount or 0) > 0]
            by_promo.append({
                'promo_id': p.id, 'promo_title': p.title,
                'times_used': len(p_orders),
                'total_discount': sum(float(o.discount or 0) for o in p_orders),
                'revenue': sum(float(o.total_amount or 0) for o in p_orders),
            })
        return {
            'gross_revenue': total_subtotal,
            'total_discounted': total_discount,
            'total_revenue': total_revenue,
            'orders_count': len(orders),
            'orders_with_discount': orders_with_discount,
            'discount_pct': (total_discount / total_subtotal * 100) if total_subtotal > 0 else 0,
            'points_redeemed': total_points,
            'points_value': total_points,
            'by_promotion': by_promo,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
