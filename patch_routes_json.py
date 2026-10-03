import re

with open('platform/verticals/homeschool/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix get_curriculum
old_curr = """    return {
        "grades": grades,
        "subjects": subjects
    }"""
new_curr = """    return {
        "grades": [{"id": g.id, "level_order": g.level_order, "name": g.name} for g in grades],
        "subjects": [{"id": s.id, "name": s.name, "color_code": s.color_code} for s in subjects]
    }"""
content = content.replace(old_curr, new_curr)

# Fix get_students
old_stu = "    return students"
new_stu = '    return [{"id": s.id, "first_name": s.first_name, "last_name": s.last_name, "grade_id": s.grade_id, "bilingual_preference": s.bilingual_preference} for s in students]'
content = content.replace(old_stu, new_stu)

# Fix create_student
old_create = "    return student"
new_create = '    return {"id": student.id, "first_name": student.first_name, "last_name": student.last_name, "grade_id": student.grade_id, "bilingual_preference": student.bilingual_preference}'
content = content.replace(old_create, new_create)

# Fix update_mastery
old_mast = "    return mastery"
new_mast = '    return {"id": mastery.id, "objective_id": mastery.objective_id, "status": mastery.status, "progress_score": mastery.progress_score}'
content = content.replace(old_mast, new_mast)

with open('platform/verticals/homeschool/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
