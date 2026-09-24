import re

with open('platform/verticals/laundry/models.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern_color = r'''    def to_dict\(self\) -> dict:
        return \{"id": self\.id, "name": self\.name, "business_id": self\.business_id\}'''
replacement_color = r'''    def to_dict(self) -> dict:
        return {"id": self.id, "name": self.name, "hex_code": getattr(self, "hex_code", None)}'''

pattern_other = r'''    def to_dict\(self\) -> dict:
        return \{"id": self\.id, "name": self\.name, "business_id": self\.business_id\}'''
replacement_other = r'''    def to_dict(self) -> dict:
        return {"id": self.id, "name": self.name}'''

# Since there are multiple occurrences of the exact same string (business_id), we need to replace them carefully.
# The first one is Color (which might need hex_code, but the others don't).
# Let's just replace all of them with {"id": self.id, "name": self.name} and then manually add hex_code for Color.

new_content = re.sub(pattern_color, replacement_other, content)

# Now fix Color specifically. It is the one right after hex_code.
new_content = new_content.replace('''    hex_code = Column(String(7), nullable=True)

    def to_dict(self) -> dict:
        return {"id": self.id, "name": self.name}''', '''    hex_code = Column(String(7), nullable=True)

    def to_dict(self) -> dict:
        return {"id": self.id, "name": self.name, "hex_code": self.hex_code}''')

with open('platform/verticals/laundry/models.py', 'w', encoding='utf-8') as f:
    f.write(new_content)
