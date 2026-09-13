import psycopg2

conn = psycopg2.connect("postgresql://postgres:YoYo158087@localhost/tintoreria_db")
cur = conn.cursor()

MEXICO_HOLIDAYS = [
    ('Año Nuevo', 1, 1),
    ('Día de la Constitución', 2, 5),
    ('Natalicio de Benito Juárez', 3, 21),
    ('Día del Trabajo', 5, 1),
    ('Independencia de México', 9, 16),
    ('Revolución Mexicana', 11, 20),
    ('Navidad', 12, 25),
]

# businesses columns
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='businesses'")
cols = [r[0] for r in cur.fetchall()]
for col, typ in [
    ('country', "VARCHAR(60) DEFAULT 'México'"),
    ('discount_enabled', 'BOOLEAN DEFAULT TRUE'),
    ('max_discount_pct', 'FLOAT DEFAULT 50.0'),
    ('normal_days', 'INTEGER DEFAULT 3'),
    ('urgent_days', 'INTEGER DEFAULT 1'),
    ('extra_urgent_days', 'INTEGER DEFAULT 0'),
    ('urgent_pct', 'FLOAT DEFAULT 20.0'),
    ('extra_urgent_pct', 'FLOAT DEFAULT 50.0'),
]:
    if col not in cols:
        cur.execute(f'ALTER TABLE businesses ADD COLUMN {col} {typ}')
        print(f'Added businesses.{col}')

# orders columns
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='orders'")
cols = [r[0] for r in cur.fetchall()]
for col, typ in [
    ('urgency', "VARCHAR(20) DEFAULT 'normal'"),
    ('delivery_date', 'TIMESTAMP'),
]:
    if col not in cols:
        cur.execute(f'ALTER TABLE orders ADD COLUMN {col} {typ}')
        print(f'Added orders.{col}')

# business_hours
cur.execute("SELECT to_regclass('business_hours')")
if cur.fetchone()[0] is None:
    cur.execute('''
        CREATE TABLE business_hours (
            id SERIAL PRIMARY KEY,
            business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            day_of_week INTEGER NOT NULL,
            is_open BOOLEAN DEFAULT TRUE,
            open_time TIME,
            close_time TIME,
            CONSTRAINT _biz_day_uc UNIQUE(business_id, day_of_week)
        )
    ''')
    print('Created business_hours')
    cur.execute('SELECT id FROM businesses')
    for (biz_id,) in cur.fetchall():
        for dow in range(6):
            cur.execute(
                "INSERT INTO business_hours(business_id,day_of_week,is_open,open_time,close_time) "
                "VALUES(%s,%s,TRUE,'09:00','19:00')",
                (biz_id, dow)
            )
        cur.execute(
            "INSERT INTO business_hours(business_id,day_of_week,is_open) VALUES(%s,6,FALSE)",
            (biz_id,)
        )
    print('Pre-loaded default hours')

# business_holidays
cur.execute("SELECT to_regclass('business_holidays')")
if cur.fetchone()[0] is None:
    cur.execute('''
        CREATE TABLE business_holidays (
            id SERIAL PRIMARY KEY,
            business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            name VARCHAR(100) NOT NULL,
            is_recurring BOOLEAN DEFAULT TRUE,
            month INTEGER,
            day INTEGER,
            specific_date DATE,
            is_active BOOLEAN DEFAULT TRUE
        )
    ''')
    print('Created business_holidays')
    cur.execute('SELECT id FROM businesses')
    for (biz_id,) in cur.fetchall():
        for name, m, d in MEXICO_HOLIDAYS:
            cur.execute(
                'INSERT INTO business_holidays(business_id,name,is_recurring,month,day,is_active) '
                'VALUES(%s,%s,TRUE,%s,%s,TRUE)',
                (biz_id, name, m, d)
            )
    print('Pre-loaded Mexico holidays')

conn.commit()
cur.close()
conn.close()
print('Migration complete')
