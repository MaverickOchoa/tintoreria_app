from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import decode_token

bearer_scheme = HTTPBearer()


def get_current_claims(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    return decode_token(credentials.credentials)


def require_super_admin(claims: dict = Depends(get_current_claims)) -> dict:
    if not claims.get("is_super_admin", False):
        raise HTTPException(status_code=403, detail="Solo el Super Administrador puede acceder.")
    return claims


def require_business_admin(claims: dict = Depends(get_current_claims)) -> dict:
    if claims.get("is_super_admin", False) or not claims.get("business_id"):
        raise HTTPException(status_code=403, detail="Solo un Administrador de Negocio puede acceder.")
    return claims


def require_authenticated(claims: dict = Depends(get_current_claims)) -> dict:
    return claims


def get_business_id(claims: dict = Depends(get_current_claims)) -> int:
    business_id = claims.get("business_id")
    if not business_id:
        raise HTTPException(status_code=403, detail="No se encontró business_id en el token.")
    return business_id
