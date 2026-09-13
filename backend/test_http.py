import sys, traceback, urllib.request, json
sys.path.insert(0, '.')

from app import app, Admin
from flask_jwt_extended import create_access_token

with app.app_context():
    a = Admin.query.filter_by(business_id=20).first()
    tok = create_access_token(
        identity=str(a.id),
        additional_claims={
            'business_id': a.business_id,
            'branch_id': None,
            'role': 'business_admin',
            'user_type': 'admin'
        }
    )

req = urllib.request.Request(
    'http://127.0.0.1:5000/api/v1/cash-cuts/preview?branch_id=13',
    headers={'Authorization': f'Bearer {tok}'}
)
try:
    with urllib.request.urlopen(req) as resp:
        print(f"Status: {resp.status}")
        print(f"Body: {resp.read().decode()}")
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print(f"Body: {e.read().decode()}")
except Exception as e:
    print(f"Failed: {e}")
    traceback.print_exc()
