import sys
sys.path.append('platform')
from backend.app import app, create_access_token
from core.security import decode_token

with app.app_context():
    token = create_access_token(identity="1", additional_claims={"business_id": 2, "is_super_admin": False, "role": "admin"})
    
print("Created token:", token[:20])

try:
    decoded = decode_token(token)
    print("Successfully decoded:", decoded)
except Exception as e:
    print("Failed to decode:", str(e))
