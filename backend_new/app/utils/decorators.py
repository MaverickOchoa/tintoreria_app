# backend_new/app/utils/decorators.py

from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt, verify_jwt_in_request

def require_roles(*allowed_roles):
    """
    Permite acceso si el claim 'role' está dentro de allowed_roles.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            role = claims.get("role")
            if role not in allowed_roles:
                return jsonify({"message": "Forbidden"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def require_superadmin(fn):
    """
    Solo Super Admin.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if not claims.get("is_superadmin") and claims.get("role") != "super_admin":
            return jsonify({"message": "Super admin required"}), 403
        return fn(*args, **kwargs)
    return wrapper

def require_business_or_superadmin(param_name="business_id"):
    """
    Permite:
      - super_admin: siempre
      - business_admin: solo si claims.business_id == <param_name> (en URL)
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()

            role = claims.get("role")
            if role == "super_admin" or claims.get("is_superadmin") is True:
                return fn(*args, **kwargs)

            if role != "business_admin":
                return jsonify({"message": "Forbidden"}), 403

            claim_business_id = claims.get("business_id")
            route_business_id = kwargs.get(param_name)

            if claim_business_id is None or route_business_id is None:
                return jsonify({"message": "Forbidden"}), 403

            if int(claim_business_id) != int(route_business_id):
                return jsonify({"message": "Forbidden"}), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator
