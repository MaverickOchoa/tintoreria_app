import re

with open('platform/core/routes/tenants.py', 'r', encoding='utf-8') as f:
    content = f.read()

new_routes = """
@router.get("/branches/{branch_id}/scan-config")
def get_branch_scan_config(branch_id: int, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch: raise HTTPException(status_code=404)
    return {"require_scan": bool(branch.require_scan), "branch_id": branch.id}
"""

if "@router.get(\"/branches/{branch_id}/scan-config\")" not in content:
    content += new_routes

with open('platform/core/routes/tenants.py', 'w', encoding='utf-8') as f:
    f.write(content)
