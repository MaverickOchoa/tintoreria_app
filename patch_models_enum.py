import re

with open('platform/verticals/homeschool/models.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix Enum columns
content = content.replace(
    'status = Column(Enum(MasteryStatus), default=MasteryStatus.NOT_STARTED)',
    'status = Column(String(30), default=MasteryStatus.NOT_STARTED.value)'
)
content = content.replace(
    'priority_level = Column(Enum(PriorityLevel), default=PriorityLevel.A)',
    'priority_level = Column(String(30), default=PriorityLevel.A.value)'
)

with open('platform/verticals/homeschool/models.py', 'w', encoding='utf-8') as f:
    f.write(content)
