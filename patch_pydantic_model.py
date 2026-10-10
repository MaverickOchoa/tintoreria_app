import re

with open('platform/verticals/homeschool/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix StudentCreate
target = """class StudentCreate(BaseModel):
    first_name: str
    last_name: str
    grade_id: int
    date_of_birth: Optional[datetime] = None
    bilingual_preference: str = "es" """

replacement = """class StudentCreate(BaseModel):
    first_name: str
    last_name: str
    grade_id: int
    date_of_birth: Optional[datetime] = None
    bilingual_preference: str = "es"
    gender: str = "unspecified" """

content = re.sub(r'class StudentCreate\(BaseModel\):.*?bilingual_preference: str = "es"', replacement.strip(), content, flags=re.DOTALL)

with open('platform/verticals/homeschool/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
