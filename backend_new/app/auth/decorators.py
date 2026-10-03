from functools import wraps
from flask import request
from flask_jwt_extended import verify_jwt_in_request, get_jwt

def superadmin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        # ✅ dejar pasar preflight
        if request.method == "OPTIONS":
            return ("", 200)

        verify_jwt_in_request()
        claims = get_jwt()
        if not claims.get("is_superadmin"):
            return {"message": "Super admin required"}, 403

        return fn(*args, **kwargs)
    return wrapper
