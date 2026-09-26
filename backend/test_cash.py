import sys, traceback
sys.path.insert(0, '.')

from app import app, db, CashCut, Branch, Order, OrderPayment, Admin
from flask_jwt_extended import create_access_token
from datetime import datetime

with app.app_context():
    try:
        admin = Admin.query.filter_by(business_id=20).first()
        if not admin:
            print("ERROR: No admin found with business_id=20")
            sys.exit(1)

        token = create_access_token(
            identity=str(admin.id),
            additional_claims={
                'business_id': admin.business_id,
                'branch_id': None,
                'role': 'business_admin',
                'user_type': 'admin'
            }
        )
        print("Token generated OK")

        branch_id = 13
        branch = Branch.query.filter_by(id=branch_id, business_id=20).first()
        print(f"Branch: {branch}")

        last_cut = CashCut.query.filter_by(branch_id=branch_id).order_by(CashCut.cut_at.desc()).first()
        print(f"Last cut: {last_cut}")

        first_order = Order.query.filter_by(branch_id=branch_id).order_by(Order.order_date.asc()).first()
        period_from = first_order.order_date if first_order else datetime.utcnow()
        print(f"period_from: {period_from}")

        payments = (db.session.query(OrderPayment.method, db.func.sum(OrderPayment.amount))
            .join(Order, Order.id == OrderPayment.order_id)
            .filter(Order.branch_id == branch_id)
            .filter(Order.order_date >= period_from)
            .group_by(OrderPayment.method)
            .all())
        print(f"payments: {payments}")

        orders_count = Order.query.filter(
            Order.branch_id == branch_id,
            Order.order_date >= period_from
        ).count()
        print(f"orders_count: {orders_count}")

        print("ALL OK")
    except Exception as e:
        print(f"EXCEPTION: {e}")
        traceback.print_exc()
