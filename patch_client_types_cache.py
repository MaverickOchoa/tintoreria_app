import re

with open('frontend/src/components/ManageClientConfig.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix cache bypass for client-types
content = content.replace("fetch(`${API}/client-types`, { headers: { Authorization: `Bearer ${token}` } })", "fetch(`${API}/client-types?_t=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` } })")

# Also for promotions just in case
content = content.replace("fetch(`${API}/promotions`, { headers: { Authorization: `Bearer ${token}` } })", "fetch(`${API}/promotions?_t=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` } })")

with open('frontend/src/components/ManageClientConfig.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
