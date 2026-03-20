from sqlalchemy import Column, Integer, String, Boolean, Float, Text, ForeignKey, Time, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from core.database import Base


class Business(Base):
    __tablename__ = "businesses"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    address = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    email = Column(String(120), unique=True, nullable=True)
    country = Column(String(60), nullable=True, default="México")
    vertical_type = Column(String(30), nullable=False, default="laundry")

    uses_iva = Column(Boolean, nullable=False, default=True)
    rfc = Column(String(20), nullable=True)
    curp = Column(String(20), nullable=True)
    sime = Column(String(50), nullable=True)
    street = Column(String(200), nullable=True)
    ext_num = Column(String(20), nullable=True)
    int_num = Column(String(20), nullable=True)
    colonia = Column(String(100), nullable=True)
    zip_code = Column(String(10), nullable=True)
    alcaldia = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    regimen_fiscal = Column(String(150), nullable=True)

    carousel_format_hint = Column(String(100), nullable=True)
    portal_primary_color = Column(String(20), nullable=True, default="#1976d2")
    portal_bg_color = Column(String(20), nullable=True, default="#f5f5f5")
    portal_slogan = Column(String(200), nullable=True)
    portal_logo_url = Column(Text, nullable=True)

    payment_cash = Column(Boolean, nullable=False, default=True)
    payment_card = Column(Boolean, nullable=False, default=True)
    payment_points = Column(Boolean, nullable=False, default=False)
    allow_deferred = Column(Boolean, nullable=False, default=True)
    points_per_peso = Column(Float, nullable=False, default=1.0)
    peso_per_point = Column(Float, nullable=False, default=1.0)

    discount_enabled = Column(Boolean, nullable=False, default=True)
    max_discount_pct = Column(Float, nullable=False, default=50.0)
    is_active = Column(Boolean, nullable=False, default=True)

    require_scan = Column(Boolean, nullable=False, default=True)
    normal_days = Column(Integer, nullable=False, default=3)
    urgent_days = Column(Integer, nullable=False, default=1)
    extra_urgent_days = Column(Integer, nullable=False, default=0)
    urgent_pct = Column(Float, nullable=False, default=20.0)
    extra_urgent_pct = Column(Float, nullable=False, default=50.0)

    branches = relationship("Branch", back_populates="business", cascade="all, delete-orphan")
    admin_user = relationship("Admin", back_populates="business", uselist=False)
    business_hours = relationship("BusinessHour", back_populates="business", cascade="all, delete-orphan")
    holidays = relationship("BusinessHoliday", back_populates="business", cascade="all, delete-orphan")

    def to_dict(self, include_branches: bool = False) -> dict:
        data = {
            "id": self.id, "name": self.name, "address": self.address,
            "phone": self.phone, "email": self.email, "country": self.country,
            "vertical_type": self.vertical_type,
            "uses_iva": self.uses_iva, "rfc": self.rfc, "curp": self.curp,
            "sime": self.sime, "street": self.street, "ext_num": self.ext_num,
            "int_num": self.int_num, "colonia": self.colonia, "zip_code": self.zip_code,
            "alcaldia": self.alcaldia, "city": self.city, "regimen_fiscal": self.regimen_fiscal,
            "payment_cash": self.payment_cash, "payment_card": self.payment_card,
            "payment_points": self.payment_points, "allow_deferred": self.allow_deferred,
            "points_per_peso": self.points_per_peso, "peso_per_point": self.peso_per_point,
            "discount_enabled": self.discount_enabled, "max_discount_pct": self.max_discount_pct,
            "require_scan": self.require_scan if self.require_scan is not None else True,
            "normal_days": self.normal_days, "urgent_days": self.urgent_days,
            "extra_urgent_days": self.extra_urgent_days,
            "urgent_pct": self.urgent_pct, "extra_urgent_pct": self.extra_urgent_pct,
            "is_active": self.is_active,
            "carousel_format_hint": self.carousel_format_hint,
            "portal_primary_color": self.portal_primary_color,
            "portal_bg_color": self.portal_bg_color,
            "portal_slogan": self.portal_slogan,
            "portal_logo_url": self.portal_logo_url,
        }
        if include_branches:
            data["branches"] = [b.to_dict() for b in self.branches]
        return data


class Branch(Base):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    address = Column(String(255), nullable=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    folio_prefix = Column(String(20), nullable=True, default="")
    folio_counter = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)

    uses_iva = Column(Boolean, nullable=True)
    payment_cash = Column(Boolean, nullable=True)
    payment_card = Column(Boolean, nullable=True)
    payment_points = Column(Boolean, nullable=True)
    allow_deferred = Column(Boolean, nullable=True)
    points_per_peso = Column(Float, nullable=True)
    peso_per_point = Column(Float, nullable=True)
    discount_enabled = Column(Boolean, nullable=True)
    max_discount_pct = Column(Float, nullable=True)
    normal_days = Column(Integer, nullable=True)
    urgent_days = Column(Integer, nullable=True)
    extra_urgent_days = Column(Integer, nullable=True)
    urgent_pct = Column(Float, nullable=True)
    extra_urgent_pct = Column(Float, nullable=True)
    require_scan = Column(Boolean, nullable=True)

    business = relationship("Business", back_populates="branches")
    users = relationship("Admin", back_populates="branch")

    def get_config(self) -> dict:
        biz = self.business
        def cv(branch_val, biz_val):
            return branch_val if branch_val is not None else biz_val

        return {
            "uses_iva": cv(self.uses_iva, biz.uses_iva if biz else True),
            "payment_cash": cv(self.payment_cash, biz.payment_cash if biz else True),
            "payment_card": cv(self.payment_card, biz.payment_card if biz else True),
            "payment_points": cv(self.payment_points, biz.payment_points if biz else False),
            "allow_deferred": cv(self.allow_deferred, biz.allow_deferred if biz else True),
            "points_per_peso": cv(self.points_per_peso, biz.points_per_peso if biz else 1.0),
            "peso_per_point": cv(self.peso_per_point, biz.peso_per_point if biz else 1.0),
            "discount_enabled": cv(self.discount_enabled, biz.discount_enabled if biz else True),
            "max_discount_pct": cv(self.max_discount_pct, biz.max_discount_pct if biz else 50.0),
            "normal_days": cv(self.normal_days, biz.normal_days if biz else 3),
            "urgent_days": cv(self.urgent_days, biz.urgent_days if biz else 1),
            "extra_urgent_days": cv(self.extra_urgent_days, biz.extra_urgent_days if biz else 0),
            "urgent_pct": cv(self.urgent_pct, biz.urgent_pct if biz else 20.0),
            "extra_urgent_pct": cv(self.extra_urgent_pct, biz.extra_urgent_pct if biz else 50.0),
            "require_scan": self.require_scan if self.require_scan is not None else True,
        }

    def to_dict(self) -> dict:
        return {
            "id": self.id, "name": self.name, "address": self.address,
            "business_id": self.business_id,
            "folio_prefix": self.folio_prefix or "",
            "folio_counter": self.folio_counter or 0,
            "is_active": self.is_active,
        }


class BusinessHour(Base):
    __tablename__ = "business_hours"

    id = Column(Integer, primary_key=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    day_of_week = Column(Integer, nullable=False)
    is_open = Column(Boolean, nullable=False, default=True)
    open_time = Column(Time, nullable=True)
    close_time = Column(Time, nullable=True)

    business = relationship("Business", back_populates="business_hours")

    def to_dict(self) -> dict:
        return {
            "id": self.id, "day_of_week": self.day_of_week, "is_open": self.is_open,
            "open_time": self.open_time.strftime("%H:%M") if self.open_time else None,
            "close_time": self.close_time.strftime("%H:%M") if self.close_time else None,
        }


class BusinessHoliday(Base):
    __tablename__ = "business_holidays"

    id = Column(Integer, primary_key=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    name = Column(String(100), nullable=False)
    is_recurring = Column(Boolean, nullable=False, default=True)
    month = Column(Integer, nullable=True)
    day = Column(Integer, nullable=True)
    specific_date = Column(Date, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    business = relationship("Business", back_populates="holidays")

    def to_dict(self) -> dict:
        return {
            "id": self.id, "name": self.name, "is_recurring": self.is_recurring,
            "month": self.month, "day": self.day,
            "specific_date": self.specific_date.isoformat() if self.specific_date else None,
            "is_active": self.is_active,
        }


class BranchItemOverride(Base):
    __tablename__ = "branch_item_overrides"
    __table_args__ = (UniqueConstraint("branch_id", "item_id", name="_branch_item_uc"),)

    id = Column(Integer, primary_key=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    price = Column(Float, nullable=True)

    def to_dict(self) -> dict:
        return {"branch_id": self.branch_id, "item_id": self.item_id, "price": self.price}
