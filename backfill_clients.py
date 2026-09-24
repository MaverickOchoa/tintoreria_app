import sys
import os
sys.path.insert(0, os.path.abspath('platform'))
from main import app
from core.database import SessionLocal
from core.models.client import Client
from werkzeug.security import generate_password_hash

db = SessionLocal()
clients = db.query(Client).filter(Client.username == None).all()

assigned_usernames = set()
for c in clients:
    base_user = c.full_name.split()[0].lower() if c.full_name else "user"
    base_user = base_user.replace(' ', '')
    username = base_user
    counter = 1
    
    while True:
        exists_in_db = db.query(Client).filter(Client.username == username, Client.id != c.id).first()
        if exists_in_db or username in assigned_usernames:
            username = f"{base_user}{counter}"
            counter += 1
        else:
            break
            
    assigned_usernames.add(username)
    c.username = username
    c.password = generate_password_hash(c.phone) if c.phone else generate_password_hash("1234567890")
    print(f"Set ID: {c.id}, User: {c.username}, Pass: {c.phone}")

db.commit()
print("Backfill complete.")
