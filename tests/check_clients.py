import requests

r = requests.post("http://127.0.0.1:5000/login", json={"username": "tany", "password": "tany"})
token = r.json()["access_token"]
h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# Obtener sucursales del negocio para tener un branch_id válido
branches_r = requests.get("http://127.0.0.1:5000/businesses/20/branches", headers=h)
branches = branches_r.json().get("branches", [])
branch_id = branches[0]["id"] if branches else None
print(f"Usando branch_id={branch_id} ({branches[0]['name'] if branches else 'N/A'})")

# Test 1: Crear cliente con branch_id
import time
phone = f"555{int(time.time())%10000000:07d}"
res = requests.post("http://127.0.0.1:5000/api/v1/clients", headers=h, json={
    "first_name": "Maria", "last_name": "Lopez", "phone": phone,
    "email": "maria@test.com", "neighborhood": "Polanco",
    "branch_id": branch_id,
})
print(f"\nPOST cliente: {res.status_code}")
client_id = res.json().get("client", {}).get("id")
print(f"  ID={client_id}, branch_id={res.json().get('client',{}).get('branch_id')}")

# Test 2: GET con búsqueda
res2 = requests.get("http://127.0.0.1:5000/api/v1/clients?search=Maria", headers=h)
clients = res2.json().get("clients", [])
print(f"\nGET ?search=Maria: {res2.status_code} — {len(clients)} resultado(s)")
for c in clients:
    print(f"  {c['full_name']} {c['last_name']} | {c['phone']} | branch={c['branch_id']}")

# Test 3: GET individual
if client_id:
    res3 = requests.get(f"http://127.0.0.1:5000/api/v1/clients/{client_id}", headers=h)
    d = res3.json()
    print(f"\nGET /clients/{client_id}: {res3.status_code}")
    print(f"  email={d.get('email')} neighborhood={d.get('neighborhood')}")

# Test 4: PUT
if client_id:
    res4 = requests.put(f"http://127.0.0.1:5000/api/v1/clients/{client_id}", headers=h,
                        json={"last_name": "García", "notes": "Actualizado"})
    d = res4.json().get("client", {})
    print(f"\nPUT: {res4.status_code} — last_name={d.get('last_name')} notes={d.get('notes')}")

# Test 5: Búsqueda por teléfono
res5 = requests.get(f"http://127.0.0.1:5000/api/v1/clients?search={phone[:5]}", headers=h)
print(f"\nGET ?search={phone[:5]}: {res5.status_code} — {len(res5.json().get('clients',[]))} resultado(s)")
