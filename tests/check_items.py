import requests

r = requests.post("http://127.0.0.1:5000/login", json={"username": "tany", "password": "tany"})
print("Login response:", r.json())
token = r.json().get("access_token")
business_id = r.json().get("business_id")
h = {"Authorization": f"Bearer {token}"}

cats = requests.get("http://127.0.0.1:5000/services/1/categories", headers=h).json()
print("Categories:", cats)
if cats.get("categories"):
    cat_id = cats["categories"][0]["id"]
    res = requests.post(f"http://127.0.0.1:5000/categories/{cat_id}/items", headers=h,
                        json={"name": "Camisa Test", "price": 50.0, "business_id": business_id})
    print(f"POST item -> {res.status_code}: {res.json()}")
