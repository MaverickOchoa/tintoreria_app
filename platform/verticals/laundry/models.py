from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, Numeric, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True)
    name = Column(String(80), unique=True, nullable=False)

    categories = relationship("Category", back_populates="service")

    def to_dict(self) -> dict:
        return {"id": self.id, "name": self.name}


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (UniqueConstraint("name", "service_id", name="_category_service_uc"),)

    id = Column(Integer, primary_key=True)
    name = Column(String(80), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)

    service = relationship("Service", back_populates="categories")
    items = relationship("Item", back_populates="category")

    def to_dict(self) -> dict:
        return {"id": self.id, "name": self.name, "service_id": self.service_id}


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True)
    name = Column(String(80), nullable=False)
    price = Column(Float, nullable=False)
    units = Column(Integer, nullable=False, default=1)
    description = Column(String(255), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=True)

    category = relationship("Category", back_populates="items")
    order_items = relationship("OrderItem", back_populates="product_service", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.id, "name": self.name, "price": self.price,
            "units": self.units, "description": self.description,
            "category_id": self.category_id, "business_id": self.business_id,
        }


class Color(Base):
    __tablename__ = "colors"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)

    def to_dict(self) -> dict:
        return {"id": self.id, "name": self.name, "business_id": self.business_id}


class Print(Base):
    __tablename__ = "prints"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)

    def to_dict(self) -> dict:
        return {"id": self.id, "name": self.name, "business_id": self.business_id}


class Defect(Base):
    __tablename__ = "defects"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)

    def to_dict(self) -> dict:
        return {"id": self.id, "name": self.name, "business_id": self.business_id}


class OrderGarmentTicket(Base):
    __tablename__ = "order_garment_tickets"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    ticket_number = Column(String(30), nullable=False)
    item_name = Column(String(120), nullable=True)
    color = Column(String(50), nullable=True)
    brand = Column(String(80), nullable=True)
    defects = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    scanned_at = Column(DateTime, nullable=True)

    order = relationship("Order", back_populates="garment_tickets")

    def to_dict(self) -> dict:
        return {
            "id": self.id, "order_id": self.order_id,
            "ticket_number": self.ticket_number,
            "item_name": self.item_name, "color": self.color,
            "brand": self.brand, "defects": self.defects, "notes": self.notes,
            "scanned_at": self.scanned_at.isoformat() if self.scanned_at else None,
        }


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)
    notes = Column(Text, nullable=True)
    color = Column(String(50), nullable=True)
    brand = Column(String(80), nullable=True)
    defects = Column(Text, nullable=True)

    order = relationship("Order", back_populates="order_items")
    product_service = relationship("Item", back_populates="order_items")

    def to_dict(self) -> dict:
        return {
            "id": self.id, "order_id": self.order_id, "item_id": self.item_id,
            "item_name": self.product_service.name if self.product_service else None,
            "quantity": self.quantity,
            "unit_price": str(self.unit_price), "subtotal": str(self.subtotal),
            "notes": self.notes, "color": self.color,
            "brand": self.brand, "defects": self.defects,
        }


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    order_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    status = Column(String(50), nullable=False, default="Creada")
    notes = Column(Text, nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False, default=0.00)
    discount = Column(Numeric(10, 2), nullable=False, default=0.00)
    tax = Column(Numeric(10, 2), nullable=False, default=0.00)
    total_amount = Column(Numeric(10, 2), nullable=False, default=0.00)
    payment_status = Column(String(20), nullable=False, default="pending")
    amount_paid = Column(Numeric(10, 2), nullable=False, default=0.00)
    folio = Column(String(30), nullable=True)
    urgency = Column(String(20), nullable=False, default="normal")
    delivery_date = Column(DateTime, nullable=True)
    carousel_position = Column(String(30), nullable=True)
    created_by_name = Column(String(100), nullable=True)
    delivered_at = Column(DateTime, nullable=True)

    order_items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("OrderPayment", back_populates="order", cascade="all, delete-orphan")
    garment_tickets = relationship("OrderGarmentTicket", back_populates="order", cascade="all, delete-orphan")
    client = relationship("Client", backref="orders")
    branch = relationship("Branch", backref="orders_taken")
    employee = relationship("Employee", backref="orders_created")

    def to_dict(self) -> dict:
        client_name = None
        if self.client:
            client_name = self.client.full_name
            if self.client.last_name:
                client_name += f" {self.client.last_name}"
        return {
            "id": self.id, "client_id": self.client_id, "branch_id": self.branch_id,
            "client_name": client_name, "employee_id": self.employee_id,
            "order_date": self.order_date.isoformat() + "Z",
            "status": self.status, "notes": self.notes,
            "subtotal": str(self.subtotal), "discount": str(self.discount),
            "tax": str(self.tax), "total_amount": str(self.total_amount),
            "payment_status": self.payment_status, "amount_paid": str(self.amount_paid),
            "folio": self.folio, "urgency": self.urgency,
            "delivery_date": self.delivery_date.isoformat() if self.delivery_date else None,
            "delivered_at": self.delivered_at.isoformat() if self.delivered_at else None,
            "carousel_position": self.carousel_position,
            "created_by_name": self.created_by_name,
            "items": [i.to_dict() for i in self.order_items],
            "payments": [p.to_dict() for p in self.payments],
            "garment_tickets": [t.to_dict() for t in self.garment_tickets],
        }
