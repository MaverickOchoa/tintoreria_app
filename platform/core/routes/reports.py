from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database import get_db
from core.dependencies import get_current_claims

router = APIRouter(tags=["reports"])

@router.get("/reports/alerts")
def get_alerts(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    return {"alerts": []}

@router.get("/reports/overview")
def get_overview(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    return {
        "revenue": 0, "expenses": 0, "profit": 0,
        "revenue_growth": 0, "expenses_growth": 0, "profit_growth": 0,
        "orders_count": 0, "new_clients": 0
    }

@router.get("/reports/summary")
def get_summary(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    return {"revenue": 0, "expenses": 0, "profit": 0}

@router.get("/reports/daily-trend")
def get_daily_trend(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    return {"trend": []}

@router.get("/reports/receivable")
def get_receivable(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    return {"total": 0, "orders": []}

@router.get("/reports/clients-detail")
def get_clients_detail(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    return {"clients": []}

@router.get("/reports/top-items")
def get_top_items(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    return {"items": []}

@router.get("/reports/discounts")
def get_discounts(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    return {"total": 0, "list": []}

@router.get("/reports/by-branch")
def get_by_branch(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    return {"branches": []}

@router.get("/reports/profitability")
def get_profitability(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    return {"total_revenue": 0, "total_cost": 0, "total_profit": 0, "margin": 0, "items": []}

@router.get("/orders/stats")
def get_order_stats(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    return {"pending": 0, "in_process": 0, "ready": 0, "delivered": 0}
