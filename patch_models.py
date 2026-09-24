import re

with open('platform/verticals/laundry/models.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove business_id from Color, Print, Defect
pattern = r'''class (Color|Print|Defect)\(Base\):
    __tablename__ = "(colors|prints|defects)"

    id = Column\(Integer, primary_key=True\)
    name = Column\(String\(\d+\), nullable=False\)
    business_id = Column\(Integer, ForeignKey\("businesses.id"\), nullable=False\)'''

def repl(m):
    cls = m.group(1)
    tbl = m.group(2)
    return f'''class {cls}(Base):
    __tablename__ = "{tbl}"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)'''

content = re.sub(pattern, repl, content)

# Color has hex_code
content = content.replace('''class Color(Base):
    __tablename__ = "colors"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)''', '''class Color(Base):
    __tablename__ = "colors"

    id = Column(Integer, primary_key=True)
    name = Column(String(80), nullable=False, unique=True)
    hex_code = Column(String(7), nullable=True)''')

with open('platform/verticals/laundry/models.py', 'w', encoding='utf-8') as f:
    f.write(content)
