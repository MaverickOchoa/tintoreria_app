import urllib.request
import urllib.error

url = "https://saas-platform-api-u6k3.onrender.com/api/v1/debug-db2"
try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    response = urllib.request.urlopen(req)
    print(response.read().decode())
except urllib.error.HTTPError as e:
    print(f"Error: {e.code}")
    print(e.read().decode())
