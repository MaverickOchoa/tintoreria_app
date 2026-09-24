import re

with open('platform/verticals/laundry/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the except block
pattern = r'''    except Exception as e:
        print\("SEED ERROR", e\)

    services = db\.query\(Service\)\.all\(\)
    return \[s\.to_dict\(\) for s in services\]'''

replacement = '''    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

    services = db.query(Service).all()
    return [s.to_dict() for s in services]'''

content = re.sub(pattern, replacement, content)

with open('platform/verticals/laundry/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
