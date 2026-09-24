import re

with open('platform/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

migration_str = '''
        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS client_push_subscriptions (
                    id SERIAL PRIMARY KEY,
                    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                    endpoint VARCHAR(1024) NOT NULL,
                    p256dh VARCHAR(255) NOT NULL,
                    auth VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """))
'''

if 'CREATE TABLE IF NOT EXISTS client_push_subscriptions' not in content:
    # Insert after a known block
    target = 'with engine.begin() as conn:'
    content = content.replace(target, target + migration_str.replace('        with engine.begin() as conn:', ''), 1)

with open('platform/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
