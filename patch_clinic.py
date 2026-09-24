import re

with open('platform/verticals/clinic/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Restore prefix="/clinic"
content = content.replace('router = APIRouter(tags=["clinic"])', 'router = APIRouter(prefix="/clinic", tags=["clinic"])')

with open('platform/verticals/clinic/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
