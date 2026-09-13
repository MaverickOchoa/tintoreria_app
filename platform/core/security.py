from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from werkzeug.security import check_password_hash, generate_password_hash
from fastapi import HTTPException, status
from core.config import get_settings

settings = get_settings()


def hash_password(password: str) -> str:
    return generate_password_hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return check_password_hash(hashed, plain)
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.jwt_access_token_expire_minutes)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado. Por favor inicia sesión nuevamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )
