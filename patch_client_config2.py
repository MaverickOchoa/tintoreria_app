with open('frontend/src/components/ManageClientConfig.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('`${API}/businesses/${claims.business_id}/config`', '`${API}/businesses/${claims.business_id}`')

with open('frontend/src/components/ManageClientConfig.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
