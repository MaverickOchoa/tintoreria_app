import re

with open('platform/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

handler_code = """
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    origin = request.headers.get("origin")
    cors_headers = {}
    if origin:
        cors_headers["Access-Control-Allow-Origin"] = origin
        cors_headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "message": exc.detail},
        headers=cors_headers,
    )
"""

if "def http_exception_handler" not in content:
    content = content.replace("API_V2 = \"/api/v2\"", handler_code + "\n\nAPI_V2 = \"/api/v2\"")

with open('platform/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
