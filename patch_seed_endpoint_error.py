import re

with open('platform/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('''@app.get("/api/v1/seed_all_data")
def seed_all_data(db: Session = Depends(get_db)):
    from verticals.laundry.models import Service, Category, Color, Print, Defect''', '''@app.get("/api/v1/seed_all_data")
def seed_all_data(db: Session = Depends(get_db)):
    from verticals.laundry.models import Service, Category, Color, Print, Defect
    try:''')

content = content.replace('''    return {"message": "Data seeded successfully!"}''', '''    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}
    return {"message": "Data seeded successfully!"}''')

with open('platform/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
