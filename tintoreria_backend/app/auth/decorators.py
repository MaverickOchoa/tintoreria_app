from flask_jwt_extended import jwt_required, get_jwt

def super_admin_required(fn):
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get("role") != "super_admin":
            return {"message": "Solo Super Admin"}, 403
        return fn(*args, **kwargs)
    return wrapper

def business_admin_required(fn):
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get("role") not in ["business_admin", "super_admin"]:
            return {"message": "Solo Business Admin"}, 403
        return fn(*args, **kwargs)
    return wrapper
