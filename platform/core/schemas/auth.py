from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    business_id: Optional[int] = None
    branch_id: Optional[int] = None
    vertical_type: Optional[str] = None
    full_name: Optional[str] = None


class SelectBranchRequest(BaseModel):
    branch_id: int
