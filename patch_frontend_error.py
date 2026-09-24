import re

with open('frontend/src/components/ManageBusinesses.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_delete = '''  const handleDeleteBusiness = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/businesses/${id}`, { method: "DELETE", headers: authHeaders });
      if (!res.ok) {
         const data = await res.json().catch(()=>({}));
         throw new Error(data.detail || data.message || "Error al eliminar");
      }
      setBusinesses((prev) => prev.filter((b) => b.id !== id));
    } catch (e) { setError(e.message); }
  };'''

# Use regex to replace the exact block
pattern = r'  const handleDeleteBusiness = async \(id\) => \{\s+try \{\s+const res = await fetch\(`\$\{API_BASE_URL\}/businesses/\$\{id\}`\, \{ method: "DELETE"\, headers: authHeaders \}\);\s+if \(!res\.ok\) throw new Error\("Error al eliminar"\);\s+setBusinesses\(\(prev\) => prev\.filter\(\(b\) => b\.id !== id\)\);\s+\} catch \(e\) \{ setError\(e\.message\); \}\s+\};'
content = re.sub(pattern, new_delete, content)

with open('frontend/src/components/ManageBusinesses.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
