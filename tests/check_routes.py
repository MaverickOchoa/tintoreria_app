import requests

r = requests.post("http://127.0.0.1:5000/login", json={"username": "hut", "password": "hut"})
token = r.json()["access_token"]
h = {"Authorization": f"Bearer {token}"}

for ep in ["/businesses", "/businesses/", "/services", "/services/"]:
    res = requests.get(f"http://127.0.0.1:5000{ep}", headers=h, allow_redirects=False)
    print(f"GET {ep} -> {res.status_code} | body='{res.text[:60]}'")
