import requests

r = requests.post("http://127.0.0.1:5000/login", json={"username": "hut", "password": "hut"})
token = r.json()["access_token"]
h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# Test GET
for ep, plural in [("/api/v1/colors","colors"), ("/api/v1/prints","prints"), ("/api/v1/defects","defects")]:
    res = requests.get(f"http://127.0.0.1:5000{ep}", headers=h)
    print(f"GET {ep} -> {res.status_code} | {plural}={res.json().get(plural, '?')}")

# Test POST color
r1 = requests.post("http://127.0.0.1:5000/api/v1/colors", headers=h, json={"name": "Rojo", "hex_code": "#ff0000"})
print(f"\nPOST color Rojo -> {r1.status_code}: {r1.json()}")

# Test POST print
r2 = requests.post("http://127.0.0.1:5000/api/v1/prints", headers=h, json={"name": "Liso"})
print(f"POST print Liso -> {r2.status_code}: {r2.json()}")

# Test POST defect
r3 = requests.post("http://127.0.0.1:5000/api/v1/defects", headers=h, json={"name": "Quemado"})
print(f"POST defect Quemado -> {r3.status_code}: {r3.json()}")
