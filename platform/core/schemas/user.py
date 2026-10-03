from pydantic import BaseModel
from typing import Optional, List

class EmployeeCreate(BaseModel):
    base_username: Optional[str] = None
    password: Optional[str] = None
    full_name: str
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    specialty: Optional[str] = None
    branch_id: int
    role_names: List[str] = []
    role_ids: List[int] = []

class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    specialty: Optional[str] = None
    branch_id: Optional[int] = None
    is_active: Optional[bool] = None
    role_names: Optional[List[str]] = None
    role_ids: Optional[List[int]] = None
    password: Optional[str] = None

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
