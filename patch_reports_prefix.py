import re

with open('platform/core/routes/reports.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('router = APIRouter(tags=["reports"])', 'router = APIRouter(tags=["reports"], prefix="/reports")')

with open('platform/core/routes/reports.py', 'w', encoding='utf-8') as f:
    f.write(content)
