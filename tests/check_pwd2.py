import requests

r = requests.post("http://127.0.0.1:5000/login", json={"username": "tany", "password": "tany"})
token = r.json()["access_token"]

emp_r = requests.get("http://127.0.0.1:5000/employees", headers={"Authorization": f"Bearer {token}"})
emp_id = emp_r.json()["employees"][0]["id"]

res = requests.put(
    f"http://127.0.0.1:5000/employees/{emp_id}/password",
    json={"password": "NuevaClave123!"},
    headers={"Authorization": f"Bearer {token}"}
)
print(f"Status: {res.status_code}")
print(f"Body: {res.text}")
