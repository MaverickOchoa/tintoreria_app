from pydantic import BaseModel, EmailStr
from typing import Optional, List


class EmployeeCreate(BaseModel):
    full_name: str
    last_name: Optional[str] = None
    email: str
    phone: str
    specialty: Optional[str] = None
    branch_id: int
    role_names: List[str] = []


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    specialty: Optional[str] = None
    branch_id: Optional[int] = None
    is_active: Optional[bool] = None
    role_names: Optional[List[str]] = None


class EmployeeOut(BaseModel):
    id: int
    username: str
    full_name: str
    last_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    specialty: Optional[str]
    branch_id: int
    business_id: int
    is_active: bool
    must_change_password: bool
    roles: List[str]

    class Config:
        from_attributes = True


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class RoleOut(BaseModel):
    id: int
    name: str
    description: Optional[str]

    class Config:
        from_attributes = True
