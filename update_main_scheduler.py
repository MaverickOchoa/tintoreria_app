import re
content = open('platform/main.py', encoding='utf-8').read()

if "from core.jobs import setup_scheduler" not in content:
    content = content.replace("from core.database import engine", "from core.database import engine\nfrom core.jobs import setup_scheduler")
    
    target = 'logger.info("Base de datos verificada/migrada exitosamente.")'
    replacement = target + '\n\n    # Start background jobs\n    setup_scheduler()'
    content = content.replace(target, replacement)
    
    open('platform/main.py', 'w', encoding='utf-8').write(content)
