from pydantic import BaseModel
from typing import Optional, List


class ClientCreate(BaseModel):
    full_name: str
    last_name: Optional[str] = None
    phone: str
    email: Optional[str] = None
    notes: Optional[str] = None
    street_and_number: Optional[str] = None
    neighborhood: Optional[str] = None
    zip_code: Optional[str] = None
    date_of_birth_day: Optional[int] = None
    date_of_birth_month: Optional[int] = None
    branch_id: Optional[int] = None
    client_type_id: Optional[int] = None


class ClientUpdate(BaseModel):
    full_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    street_and_number: Optional[str] = None
    neighborhood: Optional[str] = None
    zip_code: Optional[str] = None
    date_of_birth_day: Optional[int] = None
    date_of_birth_month: Optional[int] = None
    client_type_id: Optional[int] = None


class ClientOut(BaseModel):
    id: int
    full_name: str
    last_name: Optional[str]
    phone: str
    email: Optional[str]
    notes: Optional[str]
    branch_id: Optional[int]
    client_type_id: Optional[int]
    client_type_name: Optional[str]
    points_balance: float
    has_portal_access: bool

    class Config:
        from_attributes = True


class ClientTypeCreate(BaseModel):
    name: str


class ClientTypeOut(BaseModel):
    id: int
    name: str
    business_id: int

    class Config:
        from_attributes = True


class ClientDiscountCreate(BaseModel):
    discount_pct: float
    reason: Optional[str] = None


class ClientDiscountOut(BaseModel):
    id: int
    client_id: int
    discount_pct: float
    reason: Optional[str]
    created_at: Optional[str]

    class Config:
        from_attributes = True
