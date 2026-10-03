import re

# 1. FIX HOMESCHOOL DASHBOARD UI
with open('frontend/src/components/HomeschoolDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove any existing trash IconButtons inside the Box
content = re.sub(r'<IconButton color="error" size="small" sx=\{\{ ml: 0\.5 \}\} onClick=\{\(\) => handleDelete\(student\.id\)\} title="Borrar">\s*<span[^>]*>🗑️</span>\s*</IconButton>', '', content)

# Change Ver Progreso to Progreso
content = content.replace('>Ver Progreso</Button>', '>Progreso</Button>')

# Inject Trash button at the top of the Card
target_card = r"<Card sx=\{\{ borderRadius: 3, boxShadow: '0 4px 12px rgba\(0,0,0,0\.05\)' \}\}>"
replacement_card = '''<Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', position: 'relative' }}>
                  <IconButton 
                    color="error" 
                    size="small" 
                    sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }} 
                    onClick={() => handleDelete(student.id)} 
                    title="Borrar alumno"
                  >
                    <span role="img" aria-label="borrar" style={{ fontSize: '1.2rem' }}>🗑️</span>
                  </IconButton>'''
content = re.sub(target_card, replacement_card, content)

with open('frontend/src/components/HomeschoolDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

# 2. CREATE POST MASTERY ROUTE
with open('platform/verticals/homeschool/routes.py', 'r', encoding='utf-8') as f:
    routes_content = f.read()

mastery_route = '''
@router.post("/students/{student_id}/mastery")
def update_mastery(student_id: int, data: MasteryUpdate, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    business_id = claims.get("business_id")
    student = db.query(HSStudent).filter(HSStudent.id == student_id, HSStudent.business_id == business_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    mastery = db.query(hs_models.HSStudentMastery).filter(
        hs_models.HSStudentMastery.student_id == student_id,
        hs_models.HSStudentMastery.objective_id == data.objective_id
    ).first()
    
    if not mastery:
        mastery = hs_models.HSStudentMastery(student_id=student_id, objective_id=data.objective_id)
        db.add(mastery)
        
    mastery.status = data.status.value if hasattr(data.status, 'value') else data.status
    mastery.progress_score = data.progress_score
    
    from datetime import datetime
    mastery.last_assessed_at = datetime.utcnow()
    
    db.commit()
    return {"status": "success", "progress_score": mastery.progress_score}
'''

if "def update_mastery" not in routes_content:
    routes_content += mastery_route
    with open('platform/verticals/homeschool/routes.py', 'w', encoding='utf-8') as f:
        f.write(routes_content)

# 3. UPDATE COUNTING GAME
with open('frontend/src/components/minigames/CountingGame.jsx', 'r', encoding='utf-8') as f:
    cg_content = f.read()

if "({ onWin })" not in cg_content:
    cg_content = cg_content.replace("export default function CountingGame() {", "export default function CountingGame({ onWin }) {")
    
    win_block_old = "setMessage('¡Excelente! Has contado las manzanas correctamente. 🌟');\n      setSuccess(true);"
    win_block_new = "setMessage('¡Excelente! Has contado las manzanas correctamente. 🌟');\n      setSuccess(true);\n      if (onWin) onWin(1.0);"
    cg_content = cg_content.replace(win_block_old, win_block_new)

    with open('frontend/src/components/minigames/CountingGame.jsx', 'w', encoding='utf-8') as f:
        f.write(cg_content)

# 4. UPDATE STUDENT PORTAL to handle onWin
with open('frontend/src/components/HomeschoolStudentPortal.jsx', 'r', encoding='utf-8') as f:
    portal = f.read()

if "handleWin" not in portal:
    # Ensure API is imported
    if "import { API }" not in portal:
        portal = portal.replace('import { useParams', 'import { API } from "../../config";\nimport { useParams')

    handle_win = '''
  const handleWin = async (score) => {
    try {
      const token = localStorage.getItem("access_token");
      await fetch(${API}/homeschool/students//mastery, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: Bearer 
        },
        body: JSON.stringify({
          objective_id: 1, 
          status: "MASTERED",
          progress_score: score
        })
      });
    } catch (err) {
      console.error(err);
    }
  };
'''
    portal = portal.replace("const navigate = useNavigate();", "const navigate = useNavigate();\n" + handle_win)
    portal = portal.replace("<CountingGame />", "<CountingGame onWin={handleWin} />")

    with open('frontend/src/components/HomeschoolStudentPortal.jsx', 'w', encoding='utf-8') as f:
        f.write(portal)

