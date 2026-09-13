from app import app, db
from sqlalchemy import text

with app.app_context():
    with db.engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE branches ADD COLUMN folio_prefix VARCHAR(20) DEFAULT ''"))
            conn.commit()
            print('folio_prefix added')
        except Exception as e:
            print('folio_prefix:', e)
        try:
            conn.execute(text('ALTER TABLE branches ADD COLUMN folio_counter INTEGER DEFAULT 0 NOT NULL'))
            conn.commit()
            print('folio_counter added')
        except Exception as e:
            print('folio_counter:', e)
    print('Done')
