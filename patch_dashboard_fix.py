import re

with open('frontend/src/components/HomeschoolDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix Unicode
content = content.replace(r'Espa\u00f1ol', 'Español')
content = content.replace(r'A\u00fan', 'Aún')
content = content.replace(r'curr\u00edculum', 'currículum')
content = content.replace(r'priorizar\u00e1', 'priorizará')

# Helper function for Title Case
title_case_helper = '''const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Helper for title case
const toTitleCase = (str) => {
  return str.replace(
    /\\w\\S*/g,
    function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
};'''

content = content.replace('const API = import.meta.env.VITE_API_URL || "http://localhost:8000";', title_case_helper)

# Apply helper to onChange events
content = content.replace(
    'onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}',
    'onChange={(e) => setFormData({ ...formData, first_name: toTitleCase(e.target.value) })}'
)
content = content.replace(
    'onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}',
    'onChange={(e) => setFormData({ ...formData, last_name: toTitleCase(e.target.value) })}'
)

with open('frontend/src/components/HomeschoolDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
