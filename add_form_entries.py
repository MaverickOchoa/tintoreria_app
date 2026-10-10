import re
content = open('platform/verticals/clinic/routes.py', encoding='utf-8').read()

entries_code = """
# =============================================================================
# CLINICAL FORM ENTRIES
# =============================================================================

@router.get("/clinical-form-entries")
def list_clinical_form_entries(
    patient_id: Optional[int] = None,
    appointment_id: Optional[int] = None,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    business_id = claims.get("business_id")
    q = db.query(ClinicalFormEntry).filter_by(business_id=business_id)
    if patient_id:
        q = q.filter_by(patient_id=patient_id)
    if appointment_id:
        q = q.filter_by(appointment_id=appointment_id)
    entries = q.order_by(ClinicalFormEntry.created_at.desc()).all()
    return [e.to_dict() for e in entries]

@router.post("/clinical-form-entries")
def create_clinical_form_entry(
    body: dict,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    import json
    business_id = claims.get("business_id")
    branch_id = claims.get("branch_id")
    patient_id = body.get("patient_id")
    template_id = body.get("template_id")
    
    if not patient_id or not template_id:
        raise HTTPException(status_code=400, detail="patient_id y template_id requeridos")

    entry = ClinicalFormEntry(
        business_id=business_id,
        branch_id=branch_id,
        patient_id=patient_id,
        appointment_id=body.get("appointment_id"),
        template_id=template_id,
        form_type=body.get("form_type", "custom"),
        form_data=json.dumps(body.get("form_data", {})),
        status=body.get("status", "draft"),
        created_by=claims.get("full_name") or claims.get("username")
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry.to_dict()

@router.put("/clinical-form-entries/{entry_id}")
def update_clinical_form_entry(
    entry_id: int,
    body: dict,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    import json
    business_id = claims.get("business_id")
    entry = db.query(ClinicalFormEntry).filter_by(id=entry_id, business_id=business_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry no encontrada")

    if "form_data" in body:
        entry.form_data = json.dumps(body["form_data"])
    if "status" in body:
        entry.status = body["status"]

    db.commit()
    db.refresh(entry)
    return entry.to_dict()

"""

content += entries_code
open('platform/verticals/clinic/routes.py', 'w', encoding='utf-8').write(content)
