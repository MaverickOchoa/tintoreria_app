import re

with open('frontend/src/components/HomeschoolDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """  let familyName = claims.business_name || "Mi Familia";
  if (familyName !== "Mi Familia" && !familyName.toLowerCase().includes("familia")) {
    familyName = `Familia ${familyName}`;
  }"""

replacement = """  let familyName = claims.business_name || claims.username || "Mi Familia";
  if (familyName !== "Mi Familia" && !familyName.toLowerCase().includes("familia")) {
    // Capitalize first letter
    familyName = familyName.charAt(0).toUpperCase() + familyName.slice(1);
    familyName = `Familia ${familyName}`;
  }"""

content = content.replace(target, replacement)

# FIX THE POST / PUT issue
target2 = """      const payload = {
        ...formData,
        date_of_birth: formattedDate
      };

      const res = await fetch(`${API}/homeschool/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });"""

replacement2 = """      const payload = {
        ...formData,
        date_of_birth: formattedDate
      };

      const url = editingStudentId 
        ? `${API}/homeschool/students/${editingStudentId}` 
        : `${API}/homeschool/students`;
      const method = editingStudentId ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });"""

content = content.replace(target2, replacement2)

# Fix the emoji encoding corruption
content = content.replace("Y?", "🏠")
content = content.replace("?Y??", "🏠")

with open('frontend/src/components/HomeschoolDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
