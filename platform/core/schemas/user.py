from pydantic import BaseModel
from typing import Optional, List


class EmployeeCreate(BaseModel):
    username: str
    password: str
    full_name: str
    phone: Optional[str] = None
    branch_id: int
    role_names: List[str] = []


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    branch_id: Optional[int] = None
    is_active: Optional[bool] = None
    role_names: Optional[List[str]] = None


class EmployeeOut(BaseModel):
    id: int
    username: str
    full_name: str
    phone: Optional[str]
    branch_id: int
    business_id: int
    is_active: bool
    roles: List[str]

    class Config:
        from_attributes = True


class RoleOut(BaseModel):
    id: int
    name: str
    description: Optional[str]

    class Config:
        from_attributes = True
