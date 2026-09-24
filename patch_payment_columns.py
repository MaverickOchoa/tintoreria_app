import re

with open('platform/core/models/payment.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('paid_at = Column(DateTime', 'created_at = Column(DateTime')

# Also add points_used just in case it's mapped anywhere
if "points_used =" not in content:
    content = content.replace(
        'amount = Column(Numeric(10, 2), nullable=False)',
        'amount = Column(Numeric(10, 2), nullable=False)\n    points_used = Column(Float, nullable=True, default=0.0)'
    )

with open('platform/core/models/payment.py', 'w', encoding='utf-8') as f:
    f.write(content)

with open('platform/main.py', 'r', encoding='utf-8') as f:
    main_content = f.read()

migration = '    "ALTER TABLE order_payments ADD COLUMN IF NOT EXISTS reference VARCHAR(100);",'
if migration not in main_content:
    main_content = main_content.replace(
        '    # Clinic Expenses',
        migration + '\n    # Clinic Expenses'
    )

with open('platform/main.py', 'w', encoding='utf-8') as f:
    f.write(main_content)
