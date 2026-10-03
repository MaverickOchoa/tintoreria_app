import sqlite3
conn = sqlite3.connect(':memory:')
c = conn.cursor()
c.execute('''CREATE TABLE businesses (id INTEGER PRIMARY KEY)''')
c.execute('''CREATE TABLE branches (id INTEGER PRIMARY KEY)''')
c.execute('''CREATE TABLE employees (id INTEGER PRIMARY KEY)''')
c.execute('''CREATE TABLE IF NOT EXISTS clinic_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL REFERENCES businesses(id),
    branch_id INTEGER NOT NULL REFERENCES branches(id),
    amount FLOAT NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    expense_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    registered_by_id INTEGER REFERENCES employees(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)''')
print("Success")
