import requests

r = requests.post("http://127.0.0.1:5000/login", json={"username": "testusr9265@Reforma", "password": "Test1234!"})
print(f"testusr9265@Reforma → {r.status_code}: {r.json()}")
