import re

with open('platform/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''    return JSONResponse\(
        status_code=500,
        content=\{"detail": str\(exc\)\},
        headers=cors_headers,
    \)'''
replacement = '''    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "message": str(exc)},
        headers=cors_headers,
    )'''
content = re.sub(pattern, replacement, content)

with open('platform/main.py', 'w', encoding='utf-8') as f:
    f.write(content)

with open('platform/core/routes/auth.py', 'r', encoding='utf-8') as f:
    auth_content = f.read()
# We should also patch standard FastAPI HTTPException to include 'message' inside the response.
# Actually, the simplest way is to write a middleware or just override HTTPException handler.
