import requests
r = requests.post("http://127.0.0.1:5000/login", json={"username": "hut", "password": "hut"})
print(f"Login hut/hut: {r.status_code} -> {r.json()}")
