from pydantic import BaseModel, EmailStr
from typing import Optional, List


class BranchBase(BaseModel):
    name: str
    address: Optional[str] = None


class BranchCreate(BranchBase):
    business_id: int
    folio_prefix: Optional[str] = ""


class BranchUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    folio_prefix: Optional[str] = None
    is_active: Optional[bool] = None
    uses_iva: Optional[bool] = None
    payment_cash: Optional[bool] = None
    payment_card: Optional[bool] = None
    payment_points: Optional[bool] = None
    allow_deferred: Optional[bool] = None
    points_per_peso: Optional[float] = None
    peso_per_point: Optional[float] = None
    discount_enabled: Optional[bool] = None
    max_discount_pct: Optional[float] = None
    normal_days: Optional[int] = None
    urgent_days: Optional[int] = None
    extra_urgent_days: Optional[int] = None
    urgent_pct: Optional[float] = None
    extra_urgent_pct: Optional[float] = None
    require_scan: Optional[bool] = None


class BranchOut(BaseModel):
    id: int
    name: str
    address: Optional[str]
    business_id: int
    folio_prefix: str
    folio_counter: int
    is_active: bool

    class Config:
        from_attributes = True


class BusinessBase(BaseModel):
    name: str
    address: str
    phone: Optional[str] = None
    email: Optional[str] = None
    country: Optional[str] = "México"
    vertical_type: Optional[str] = "laundry"


class BusinessCreate(BusinessBase):
    admin_username: str
    admin_password: str


class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    uses_iva: Optional[bool] = None
    rfc: Optional[str] = None
    payment_cash: Optional[bool] = None
    payment_card: Optional[bool] = None
    payment_points: Optional[bool] = None
    allow_deferred: Optional[bool] = None
    points_per_peso: Optional[float] = None
    peso_per_point: Optional[float] = None
    discount_enabled: Optional[bool] = None
    max_discount_pct: Optional[float] = None
    normal_days: Optional[int] = None
    urgent_days: Optional[int] = None
    extra_urgent_days: Optional[int] = None
    urgent_pct: Optional[float] = None
    extra_urgent_pct: Optional[float] = None
    require_scan: Optional[bool] = None
    vertical_type: Optional[str] = None
    portal_primary_color: Optional[str] = None
    portal_bg_color: Optional[str] = None
    portal_slogan: Optional[str] = None


class BusinessOut(BaseModel):
    id: int
    name: str
    address: str
    phone: Optional[str]
    email: Optional[str]
    country: Optional[str]
    vertical_type: str
    is_active: bool
    uses_iva: bool

    class Config:
        from_attributes = True
