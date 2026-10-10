import re

with open('frontend/src/components/HomeschoolDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_handle_change = """  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };"""

new_handle_change = """  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === "first_name" || name === "last_name") {
      finalValue = toTitleCase(value);
    }
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
  };"""

content = content.replace(old_handle_change, new_handle_change)

with open('frontend/src/components/HomeschoolDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
