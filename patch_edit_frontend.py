import re

with open('frontend/src/components/HomeschoolDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. State for editingStudentId
content = content.replace(
    'const [submitting, setSubmitting] = useState(false);',
    'const [submitting, setSubmitting] = useState(false);\n  const [editingStudentId, setEditingStudentId] = useState(null);'
)

# 2. handleEdit function
handle_edit_fn = """  const handleEdit = (student) => {
    setEditingStudentId(student.id);
    setFormData({
      first_name: student.first_name || "",
      last_name: student.last_name || "",
      grade_id: student.grade_id || "",
      date_of_birth: student.date_of_birth ? student.date_of_birth.substring(0,10) : "",
      bilingual_preference: student.bilingual_preference || "es",
      gender: student.gender || ""
    });
    setOpen(true);
  };

  const handleClose = () => {"""
content = content.replace('  const handleClose = () => {', handle_edit_fn)

# 3. reset in handleClose
content = content.replace(
    'setOpen(false);\n  };',
    'setOpen(false);\n    setEditingStudentId(null);\n  };'
)

# 4. handleSubmit logic (PUT instead of POST)
old_submit = """      const res = await fetch(`${API}/homeschool/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });"""

new_submit = """      const url = editingStudentId ? `${API}/homeschool/students/${editingStudentId}` : `${API}/homeschool/students`;
      const method = editingStudentId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });"""
content = content.replace(old_submit, new_submit)

# 5. Dialog Title and Button
content = content.replace(
    '<DialogTitle>Registrar Nuevo Alumno</DialogTitle>',
    '<DialogTitle>{editingStudentId ? "Editar Alumno" : "Registrar Nuevo Alumno"}</DialogTitle>'
)
content = content.replace(
    '{submitting ? "Guardando..." : "Guardar Alumno"}',
    '{submitting ? "Guardando..." : (editingStudentId ? "Actualizar Alumno" : "Guardar Alumno")}'
)

# 6. Bind Editar Button
content = re.sub(
    r'<Button variant="outlined" fullWidth size="small">\s*Editar\s*</Button>',
    '<Button variant="outlined" fullWidth size="small" onClick={() => handleEdit(student)}>Editar</Button>',
    content
)

with open('frontend/src/components/HomeschoolDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
