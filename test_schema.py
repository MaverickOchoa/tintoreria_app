import json
from pydantic import ValidationError
import sys
sys.path.append("platform")
from core.schemas.client import ClientCreate

payload = {
    "first_name": "Zabdi",
    "last_name": "Ochoa",
    "phone": "5530746983",
    "email": "ybarratinto@gmail.com",
    "whatsapp_consent": False,
    "email_consent": False,
    "client_type_id": 1,
    "branch_id": 3
}

try:
    c = ClientCreate(**payload)
    print("Valid!")
except ValidationError as e:
    print(e.json())
