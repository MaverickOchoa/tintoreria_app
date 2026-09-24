import re

with open('platform/verticals/laundry/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''    except Exception as e:
        import traceback
        return \{"error": str\(e\), "traceback": traceback\.format_exc\(\)\}

    services = db\.query\(Service\)\.all\(\)
    return \[s\.to_dict\(\) for s in services\]'''

replacement = '''    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

    services = db.query(Service).all()
    colors = db.query(Color).count()
    prints = db.query(Print).count()
    defects = db.query(Defect).count()
    return {
        "services_seeded": [s.to_dict() for s in services],
        "colors_count": colors,
        "prints_count": prints,
        "defects_count": defects
    }'''

content = re.sub(pattern, replacement, content)

with open('platform/verticals/laundry/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
