import requests, json

r = requests.post("http://127.0.0.1:5000/login", json={"username": "tany", "password": "tany"})
token = r.json()["access_token"]
e = requests.get("http://127.0.0.1:5000/employees", headers={"Authorization": f"Bearer {token}"})
employees = e.json().get("employees", [])
print("Total employees:", len(employees))
if employees:
    print("Sample employee:", json.dumps(employees[0], indent=2))
