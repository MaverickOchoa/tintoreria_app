import requests
from backend.app import app, create_access_token
import os

with app.app_context():
    token = create_access_token(identity="1", additional_claims={"business_id": 2, "is_super_admin": False, "role": "admin"})

r = requests.get('http://127.0.0.1:8000/api/v2/businesses/2', headers={'Authorization': f'Bearer {token}'})
print(r.status_code)
print(r.json())
