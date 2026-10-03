import sqlite3
import urllib.request
import json

url = "https://saas-platform-api-u6k3.onrender.com/api/v1/debug-db"
try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    response = urllib.request.urlopen(req)
    data = json.loads(response.read().decode())
    print(data)
except Exception as e:
    print(e)
