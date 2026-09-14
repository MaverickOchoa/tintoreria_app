import requests
import json
url = 'http://localhost:8000/clinic/patient/push-subscribe'
payload = {
    'endpoint': 'https://fcm.googleapis.com/fcm/send/123',
    'keys': {
        'p256dh': '123',
        'auth': '123'
    }
}
try:
    print('Testing...')
    res = requests.post(url, json=payload, headers={'Authorization': 'Bearer asdf'})
    print(res.status_code, res.text)
except Exception as e:
    print(e)
