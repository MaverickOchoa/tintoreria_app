import re

with open('platform/verticals/homeschool/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

delete_route = """@router.delete("/students/{student_id}")
def delete_student(student_id: int, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    business_id = claims.get("business_id")
    student = db.query(HSStudent).filter(HSStudent.id == student_id, HSStudent.business_id == business_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    db.delete(student)
    db.commit()
    return {"status": "deleted"}
"""

if "def delete_student" not in content:
    content = content + "\n\n" + delete_route

with open('platform/verticals/homeschool/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)

# Now update the UI to have a delete button
with open('frontend/src/components/HomeschoolDashboard.jsx', 'r', encoding='utf-8') as f:
    ui_content = f.read()

# Add handleDelete function
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

ui_content = ui_content.replace('const handleEditClick', handle_delete_func + '\n\n  const handleEditClick')

# Add Delete icon button next to Edit
card_buttons = """<Button variant="outlined" size="small" sx={{ borderRadius: 2 }} onClick={() => handleEditClick(student)}>
                        Editar
                      </Button>"""

card_buttons_new = """<Button variant="outlined" size="small" sx={{ borderRadius: 2 }} onClick={() => handleEditClick(student)}>
                        Editar
                      </Button>
                      <Button variant="text" color="error" size="small" sx={{ minWidth: "40px" }} onClick={() => handleDelete(student.id)}>
                        🗑️
                      </Button>"""

ui_content = ui_content.replace(card_buttons, card_buttons_new)

with open('frontend/src/components/HomeschoolDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(ui_content)
