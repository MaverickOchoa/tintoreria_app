from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from werkzeug.security import check_password_hash, generate_password_hash
from fastapi import HTTPException, status
from core.config import get_settings

settings = get_settings()


def hash_password(password: str) -> str:
    return generate_password_hash(password)

def validate_password_policy(password: str) -> None:
    if len(password) < 12:
        raise ValueError("La contraseña debe tener al menos 12 caracteres.")
    if not any(c.isupper() for c in password):
        raise ValueError("La contraseña debe contener al menos una letra mayúscula.")
    if not any(c.isdigit() for c in password):
        raise ValueError("La contraseña debe contener al menos un número.")
    import re
    if not re.search(r"[!@#$%^&*()\-_=+{};:,<.>/?\|`~]", password):
        raise ValueError("La contraseña debe contener al menos un carácter especial.")


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


def generate_unique_username(first: str, last: str, db) -> str:
    import unicodedata, re
    def slugify(s):
        s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
        return re.sub(r'[^a-z0-9]', '', s.lower())
    
    name = slugify(first or '')
    last_name = slugify(last or '')
    base = f"{name}.{last_name}" if last_name else name
    
    from core.models.user import Admin, Employee
    from core.models.client import Client
    
    candidate = base
    count = 1
    while True:
        if db.query(Admin).filter(Admin.username == candidate).first():
            pass
        elif db.query(Employee).filter(Employee.username == candidate).first():
            pass
        elif db.query(Client).filter(Client.username == candidate).first():
            pass
        else:
            break
        candidate = f"{base}{count}"
        count += 1
    return candidate
