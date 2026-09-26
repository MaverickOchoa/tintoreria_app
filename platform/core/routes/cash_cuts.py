from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import Optional
import traceback

from core.database import get_db
from core.dependencies import get_current_claims
from verticals.laundry.models import Order
from core.models.payment import OrderPayment, CashCut
from core.models.tenant import Branch

router = APIRouter(tags=["cash-cuts"])

@router.get("/cash-cuts/preview")
def cash_cut_preview(
    branch_id: Optional[int] = None,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    try:
        business_id = claims.get('business_id')
        branch_id = branch_id or claims.get('branch_id')
        if not branch_id:
            raise HTTPException(status_code=400, detail='branch_id requerido')
        
        branch = db.query(Branch).filter(Branch.id == branch_id, Branch.business_id == business_id).first()
        if not branch:
            raise HTTPException(status_code=403, detail='Sucursal no autorizada')

        now = datetime.utcnow()
        last_cut = db.query(CashCut).filter(CashCut.branch_id == branch_id).order_by(CashCut.cut_at.desc()).first()
        period_from = last_cut.cut_at if last_cut else None
        
        if period_from is None:
            first_order = db.query(Order).filter(Order.branch_id == branch_id).order_by(Order.order_date.asc()).first()
            period_from = first_order.order_date if first_order else now

        payments = (db.query(OrderPayment.method, func.sum(OrderPayment.amount))
            .join(Order, Order.id == OrderPayment.order_id)
            .filter(Order.branch_id == branch_id)
            .filter(OrderPayment.created_at >= period_from)
            .group_by(OrderPayment.method)
            .all())

        totals = {m: float(a or 0) for m, a in payments}
        orders_count = db.query(Order).filter(
            Order.branch_id == branch_id,
            Order.order_date >= period_from
        ).count()

        return {
            'period_from': period_from.isoformat() if period_from else None,
            'period_to': now.isoformat(),
            'orders_count': orders_count,
            'expected_cash': totals.get('cash', 0.0) or totals.get('Efectivo', 0.0),
            'card_total': totals.get('card', 0.0) or totals.get('Tarjeta', 0.0),
            'points_total': totals.get('points', 0.0) or totals.get('Puntos', 0.0),
            'last_cut_at': last_cut.cut_at.isoformat() if last_cut else None,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cash-cuts")
def list_cash_cuts(
    branch_id: Optional[int] = None,
    limit: int = 20,
    offset: int = 0,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    try:
        business_id = claims.get('business_id')
        branch_id = branch_id or claims.get('branch_id')
        
        q = db.query(CashCut).filter(CashCut.business_id == business_id)
        if branch_id:
            branch = db.query(Branch).filter(Branch.id == branch_id, Branch.business_id == business_id).first()
            if not branch:
                raise HTTPException(status_code=403, detail='Sucursal no autorizada')
            q = q.filter(CashCut.branch_id == branch_id)

        total = q.count()
        cuts = q.order_by(CashCut.cut_at.desc()).limit(limit).offset(offset).all()
        return {'items': [c.to_dict() for c in cuts], 'total': total}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


from pydantic import BaseModel
class CashCutCreate(BaseModel):
    branch_id: Optional[int] = None
    counted_cash: float
    notes: Optional[str] = None

@router.post("/cash-cuts", status_code=201)
def create_cash_cut(
    payload: CashCutCreate,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    try:
        business_id = claims.get('business_id')
        branch_id = payload.branch_id or claims.get('branch_id')
        if not branch_id:
            raise HTTPException(status_code=400, detail='branch_id requerido')
            
        branch = db.query(Branch).filter(Branch.id == branch_id, Branch.business_id == business_id).first()
        if not branch:
            raise HTTPException(status_code=403, detail='Sucursal no autorizada')

        now = datetime.utcnow()
        last_cut = db.query(CashCut).filter(CashCut.branch_id == branch_id).order_by(CashCut.cut_at.desc()).first()
        period_from = last_cut.cut_at if last_cut else None
        
        if period_from is None:
            first_order = db.query(Order).filter(Order.branch_id == branch_id).order_by(Order.order_date.asc()).first()
            period_from = first_order.order_date if first_order else now

        payments = (db.query(OrderPayment.method, func.sum(OrderPayment.amount))
            .join(Order, Order.id == OrderPayment.order_id)
            .filter(Order.branch_id == branch_id)
            .filter(OrderPayment.created_at >= period_from)
            .group_by(OrderPayment.method)
            .all())
            
        totals = {m: float(a or 0) for m, a in payments}
        expected_cash = totals.get('cash', 0.0) or totals.get('Efectivo', 0.0)
        
        orders_count = db.query(Order).filter(
            Order.branch_id == branch_id,
            Order.order_date >= period_from
        ).count()

        identity = claims.get('sub', 'Unknown')
        
        cut = CashCut(
            branch_id=branch_id,
            business_id=business_id,
            cut_by=identity,
            cut_at=now,
            period_from=period_from,
            period_to=now,
            orders_count=orders_count,
            expected_cash=expected_cash,
            counted_cash=payload.counted_cash,
            difference=payload.counted_cash - expected_cash,
            card_total=totals.get('card', 0.0) or totals.get('Tarjeta', 0.0),
            points_total=totals.get('points', 0.0) or totals.get('Puntos', 0.0),
            notes=payload.notes,
        )
        db.add(cut)
        db.commit()
        db.refresh(cut)
        return cut.to_dict()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
