import urllib.request, urllib.parse, json

BASE = "http://127.0.0.1:5000"

def do(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

# Login
status, data = do("POST", "/api/v1/auth/login", {"username": "tany", "password": "tany"})
print(f"Login: {status}", data.get("role"), data.get("business_id"))
token = data.get("access_token")

# GET item 32
status, data = do("GET", "/items/32", token=token)
print(f"GET /items/32: {status}", data)

# PUT item 32
status, data = do("PUT", "/items/32", {"name": "Test Edit", "price": 999.99}, token=token)
print(f"PUT /items/32: {status}", data)

# GET again
status, data = do("GET", "/items/32", token=token)
print(f"GET after PUT: {status}", data)
