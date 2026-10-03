import sys
import os

# Append platform path to sys.path so we can import from core
sys.path.append(os.path.abspath('platform'))

from sqlalchemy.orm import Session
from core.database import SessionLocal
from verticals.laundry.models import Order

def check_orders():
    db = SessionLocal()
    try:
        orders = db.query(Order).filter(Order.folio.in_(['V0002', 'V0003'])).all()
        for o in orders:
            print(f"Order: {o.folio}, delivery_date: {o.delivery_date}, type: {type(o.delivery_date)}")
    finally:
        db.close()

if __name__ == "__main__":
    check_orders()
