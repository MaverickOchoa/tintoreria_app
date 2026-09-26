import os
from core.config import get_settings
from sqlalchemy import create_engine, text

engine = create_engine(get_settings().database_url)
with engine.connect() as conn:
    res = conn.execute(text("SELECT id, is_paid, scheduled_at, completed_at FROM appointments ORDER BY id DESC LIMIT 5"))
    for row in res:
        print(row)
