import re

with open('platform/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract the endpoint
pattern = r'''@app\.get\("/api/v1/seed_all_data"\)
def seed_all_data\(db: Session = Depends\(get_db\)\):.*?return \{"message": "Data seeded successfully!"\}'''

m = re.search(pattern, content, flags=re.DOTALL)
if m:
    endpoint_code = m.group(0)
    # Remove it from the end
    content = content.replace(endpoint_code, '')
    
    # Insert it BEFORE app.mount("/", WSGIMiddleware(flask_app))
    content = content.replace('app.mount("/", WSGIMiddleware(flask_app))', endpoint_code + '\n\napp.mount("/", WSGIMiddleware(flask_app))')
    
    with open('platform/main.py', 'w', encoding='utf-8') as f:
        f.write(content)
