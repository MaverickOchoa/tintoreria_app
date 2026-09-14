from backend.app import app, create_access_token
from flask_jwt_extended import decode_token

with app.app_context():
    token = create_access_token(identity="1", additional_claims={"business_id": 2})
    decoded = decode_token(token)
    print("Decoded Token:", decoded)
