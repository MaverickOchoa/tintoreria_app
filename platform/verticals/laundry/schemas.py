from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class OrderItemIn(BaseModel):
    item_id: int
    quantity: int = 1
    unit_price: float
    notes: Optional[str] = None
    color: Optional[str] = None
    brand: Optional[str] = None
    defects: Optional[str] = None


class OrderCreate(BaseModel):
    client_id: int
    branch_id: int
    urgency: str = "normal"
    notes: Optional[str] = None
    items: List[OrderItemIn]
    discount_pct: Optional[float] = None
    promo_id: Optional[int] = None


class OrderStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


class OrderPaymentIn(BaseModel):
    method: str
    amount: float
    reference: Optional[str] = None


class GarmentScanIn(BaseModel):
    ticket_number: str


class CarouselAssignIn(BaseModel):
    position: str


class ItemCreate(BaseModel):
    name: str
    price: float
    units: int = 1
    description: Optional[str] = None
    category_id: int
    business_id: Optional[int] = None


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    units: Optional[int] = None
    description: Optional[str] = None


class CategoryCreate(BaseModel):
    name: str
    service_id: int


class ServiceCreate(BaseModel):
    name: str
