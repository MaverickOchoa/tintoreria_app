import re

with open('frontend/src/components/HomeschoolDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

handle_delete_func = """  const handleDelete = async (studentId) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este alumno?")) return;
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API}/homeschool/students/${studentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };"""

# Insert handleDelete right before handleEdit
content = content.replace("  const handleEdit = ", handle_delete_func + "\n\n  const handleEdit = ")

# Replace the Editar button
target_button = '<Button variant="outlined" fullWidth size="small" onClick={() => handleEdit(student)}>Editar</Button>'
replacement_button = """<Button variant="outlined" fullWidth size="small" onClick={() => handleEdit(student)}>Editar</Button>
                      <Button variant="text" color="error" size="small" sx={{ minWidth: "40px", ml: 1 }} onClick={() => handleDelete(student.id)}>
                        🗑️
                      </Button>"""

content = content.replace(target_button, replacement_button)

with open('frontend/src/components/HomeschoolDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
