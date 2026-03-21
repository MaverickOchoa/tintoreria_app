from flask import Flask, request, jsonify
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt, get_jwt_identity
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_restful import Api, Resource, reqparse
from flask_migrate import Migrate
from flask_cors import CORS
from sqlalchemy import UniqueConstraint, or_, Numeric
from sqlalchemy.orm import joinedload
from apscheduler.schedulers.background import BackgroundScheduler
import atexit
from datetime import datetime, date, timedelta, time as dt_time
import os
from dotenv import load_dotenv

load_dotenv()

try:
    from twilio.rest import Client as TwilioClient
    _TWILIO_AVAILABLE = True
except ImportError:
    _TWILIO_AVAILABLE = False

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://postgres:YoYo158087@localhost/tintoreria_db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'dev-only-fallback-key-change-in-prod')
app.config['PROPAGATE_EXCEPTIONS'] = True
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024

db = SQLAlchemy(app)
migrate = Migrate(app, db)
api = Api(app)
jwt = JWTManager(app)

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return {"message": "Token expirado. Inicia sesión nuevamente."}, 401

@jwt.invalid_token_loader
def invalid_token_callback(error_string):
    return {"message": "Token inválido."}, 401

@jwt.unauthorized_loader
def missing_token_callback(error_string):
    return {"message": "Token requerido."}, 401

@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload):
    return {"message": "Token revocado."}, 401

CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=False)

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS,PATCH'
    return response


@app.errorhandler(401)
def handle_401(e):
    from flask import jsonify as _jsonify
    resp = _jsonify({"message": "Token inválido o expirado. Por favor inicia sesión nuevamente."})
    resp.status_code = 401
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    resp.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS,PATCH'
    return resp

@app.errorhandler(422)
def handle_422(e):
    from flask import jsonify as _jsonify
    resp = _jsonify({"message": "Token inválido o expirado. Por favor inicia sesión nuevamente."})
    resp.status_code = 422
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    resp.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS,PATCH'
    return resp

@app.errorhandler(Exception)
def handle_unhandled_exception(e):
    from flask import jsonify as _jsonify
    import traceback
    traceback.print_exc()
    resp = _jsonify({"message": str(e)})
    resp.status_code = 500
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    resp.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS,PATCH'
    return resp

@app.route('/')
def index():
    return jsonify({"message": "Backend de Tintorería funcionando correctamente. Usa /api/v1/... para los endpoints."})

# --- DECORADORES PERSONALIZADOS ---
def super_admin_required():
    def wrapper(fn):
        @jwt_required()
        def decorator(*args, **kwargs):
            claims = get_jwt()
            if not claims.get("is_super_admin", False):
                return {"message": "Solo el Super Administrador puede acceder a este recurso"}, 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper

def business_admin_required():
    def wrapper(fn):
        @jwt_required()
        def decorator(*args, **kwargs):
            claims = get_jwt()
            is_business_admin = (not claims.get("is_super_admin", False) and claims.get("business_id") is not None)
            if not is_business_admin:
                return {"message": "Solo un Administrador de Negocio puede acceder a este recurso"}, 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper

# --- MODELOS DE LA BASE DE DATOS ---
employee_roles = db.Table('employee_roles',
    db.Column('employee_id', db.Integer, db.ForeignKey('employees.id'), primary_key=True),
    db.Column('role_id', db.Integer, db.ForeignKey('roles.id'), primary_key=True)
)

# ─── HELPER: calcular fecha de entrega en días hábiles ───────────────────────
def calculate_delivery_date(business_id, from_dt, working_days):
    """Avanza `working_days` días hábiles desde from_dt, saltando domingos, días
    sin horario de apertura y festivos activos del negocio."""
    if working_days == 0:
        return from_dt

    # Cargar horario y festivos una sola vez
    hours_map = {h.day_of_week: h for h in BusinessHour.query.filter_by(business_id=business_id).all()}
    holidays = BusinessHoliday.query.filter_by(business_id=business_id, is_active=True).all()

    def is_holiday(d):
        for h in holidays:
            if h.is_recurring and h.month == d.month and h.day == d.day:
                return True
            if not h.is_recurring and h.specific_date == d:
                return True
        return False

    current = from_dt.date() if isinstance(from_dt, datetime) else from_dt
    days_added = 0
    while days_added < working_days:
        current += timedelta(days=1)
        dow = current.weekday()  # 0=Mon … 6=Sun
        bh = hours_map.get(dow)
        if bh is None:
            # Sin configuración → asumimos Lun-Sab abierto
            if dow == 6:  # domingo cerrado por defecto
                continue
        else:
            if not bh.is_open:
                continue
        if is_holiday(current):
            continue
        days_added += 1

    # Hora de entrega = cierre del día o mediodía si no hay configuración
    bh = hours_map.get(current.weekday())
    close = bh.close_time if bh and bh.close_time else dt_time(18, 0)
    return datetime.combine(current, close)


class Role(db.Model):
    __tablename__ = 'roles'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'description': self.description}

class Agency(db.Model):
    __tablename__ = 'agencies'
    id           = db.Column(db.Integer, primary_key=True)
    name         = db.Column(db.String(120), nullable=False)
    contact_name = db.Column(db.String(150), nullable=True)
    email        = db.Column(db.String(120), nullable=True)
    phone        = db.Column(db.String(20), nullable=True)
    is_active    = db.Column(db.Boolean, nullable=False, default=True)
    notes        = db.Column(db.Text, nullable=True)
    created_at   = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    businesses   = db.relationship('Business', backref='agency', lazy=True)

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name, 'contact_name': self.contact_name,
            'email': self.email, 'phone': self.phone, 'is_active': self.is_active,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'business_count': len(self.businesses),
        }


class Business(db.Model):
    __tablename__ = 'businesses'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    address = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    email = db.Column(db.String(120), unique=True, nullable=True)
    country = db.Column(db.String(60), nullable=True, default='México')
    uses_iva = db.Column(db.Boolean, nullable=False, default=True)
    rfc = db.Column(db.String(20), nullable=True)
    curp = db.Column(db.String(20), nullable=True)
    sime = db.Column(db.String(50), nullable=True)
    street = db.Column(db.String(200), nullable=True)
    ext_num = db.Column(db.String(20), nullable=True)
    int_num = db.Column(db.String(20), nullable=True)
    colonia = db.Column(db.String(100), nullable=True)
    zip_code = db.Column(db.String(10), nullable=True)
    alcaldia = db.Column(db.String(100), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    regimen_fiscal = db.Column(db.String(150), nullable=True)
    carousel_format_hint = db.Column(db.String(100), nullable=True)
    portal_primary_color = db.Column(db.String(20), nullable=True, default='#1976d2')
    portal_bg_color = db.Column(db.String(20), nullable=True, default='#f5f5f5')
    portal_slogan = db.Column(db.String(200), nullable=True)
    portal_logo_url = db.Column(db.Text, nullable=True)
    # Payment settings
    payment_cash = db.Column(db.Boolean, nullable=False, default=True)
    payment_card = db.Column(db.Boolean, nullable=False, default=True)
    payment_points = db.Column(db.Boolean, nullable=False, default=False)
    allow_deferred = db.Column(db.Boolean, nullable=False, default=True)
    points_per_peso = db.Column(db.Float, nullable=False, default=1.0)
    peso_per_point = db.Column(db.Float, nullable=False, default=1.0)
    # Discount settings
    discount_enabled = db.Column(db.Boolean, nullable=False, default=True)
    max_discount_pct = db.Column(db.Float, nullable=False, default=50.0)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    # Production settings
    require_scan = db.Column(db.Boolean, nullable=False, default=True)
    # Vertical & agency
    vertical_type = db.Column(db.String(30), nullable=False, default='laundry')
    agency_id     = db.Column(db.Integer, db.ForeignKey('agencies.id'), nullable=True)
    # Urgency settings
    normal_days = db.Column(db.Integer, nullable=False, default=3)
    urgent_days = db.Column(db.Integer, nullable=False, default=1)
    extra_urgent_days = db.Column(db.Integer, nullable=False, default=0)
    urgent_pct = db.Column(db.Float, nullable=False, default=20.0)
    extra_urgent_pct = db.Column(db.Float, nullable=False, default=50.0)
    admin_user = db.relationship('Admin', back_populates='business', uselist=False)
    branches = db.relationship('Branch', backref='owner_business', lazy=True, cascade="all, delete-orphan")
    items = db.relationship('Item', backref='business', lazy=True)
    business_hours = db.relationship('BusinessHour', backref='business', lazy=True, cascade="all, delete-orphan")
    holidays = db.relationship('BusinessHoliday', backref='business', lazy=True, cascade="all, delete-orphan")
    def to_dict(self, include_branches=False):
        data = {
            'id': self.id, 'name': self.name, 'address': self.address,
            'phone': self.phone, 'email': self.email, 'country': self.country,
            'uses_iva': self.uses_iva,
            'rfc': self.rfc, 'curp': self.curp, 'sime': self.sime,
            'street': self.street, 'ext_num': self.ext_num, 'int_num': self.int_num,
            'colonia': self.colonia, 'zip_code': self.zip_code,
            'alcaldia': self.alcaldia, 'city': self.city, 'regimen_fiscal': self.regimen_fiscal,
            'payment_cash': self.payment_cash, 'payment_card': self.payment_card,
            'payment_points': self.payment_points, 'allow_deferred': self.allow_deferred,
            'points_per_peso': self.points_per_peso, 'peso_per_point': self.peso_per_point,
            'discount_enabled': self.discount_enabled, 'max_discount_pct': self.max_discount_pct,
            'require_scan': self.require_scan if self.require_scan is not None else True,
            'normal_days': self.normal_days, 'urgent_days': self.urgent_days,
            'extra_urgent_days': self.extra_urgent_days,
            'urgent_pct': self.urgent_pct, 'extra_urgent_pct': self.extra_urgent_pct,
            'is_active': self.is_active,
            'vertical_type': self.vertical_type or 'laundry',
            'agency_id': self.agency_id,
            'carousel_format_hint': self.carousel_format_hint,
            'portal_primary_color': self.portal_primary_color,
            'portal_bg_color': self.portal_bg_color,
            'portal_slogan': self.portal_slogan,
            'portal_logo_url': self.portal_logo_url,
            'owner_admin_id': (Admin.query.filter_by(business_id=self.id).order_by(Admin.id).first() or Admin()).id,
        }
        if include_branches:
            data['branches'] = [b.to_dict() for b in self.branches]
        return data

class BusinessHour(db.Model):
    __tablename__ = 'business_hours'
    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey('businesses.id'), nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=True)
    day_of_week = db.Column(db.Integer, nullable=False)
    is_open = db.Column(db.Boolean, nullable=False, default=True)
    open_time = db.Column(db.Time, nullable=True)
    close_time = db.Column(db.Time, nullable=True)
    def to_dict(self):
        return {'id': self.id, 'day_of_week': self.day_of_week, 'is_open': self.is_open,
                'open_time': self.open_time.strftime('%H:%M') if self.open_time else None,
                'close_time': self.close_time.strftime('%H:%M') if self.close_time else None}

class BusinessHoliday(db.Model):
    __tablename__ = 'business_holidays'
    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey('businesses.id'), nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=True)
    name = db.Column(db.String(100), nullable=False)
    is_recurring = db.Column(db.Boolean, nullable=False, default=True)
    month = db.Column(db.Integer, nullable=True)
    day = db.Column(db.Integer, nullable=True)
    specific_date = db.Column(db.Date, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'is_recurring': self.is_recurring,
                'month': self.month, 'day': self.day,
                'specific_date': self.specific_date.isoformat() if self.specific_date else None,
                'is_active': self.is_active}

class BranchItemOverride(db.Model):
    __tablename__ = 'branch_item_overrides'
    id = db.Column(db.Integer, primary_key=True)
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('items.id'), nullable=False)
    price = db.Column(db.Float, nullable=True)
    __table_args__ = (db.UniqueConstraint('branch_id', 'item_id', name='_branch_item_uc'),)
    def to_dict(self):
        return {'branch_id': self.branch_id, 'item_id': self.item_id, 'price': self.price}

class Admin(db.Model):
    __tablename__ = 'admins'
    id              = db.Column(db.Integer, primary_key=True)
    username        = db.Column(db.String(80), unique=True, nullable=False)
    password        = db.Column(db.String(255), nullable=False)
    is_super_admin  = db.Column(db.Boolean, default=False)
    business_id     = db.Column(db.Integer, db.ForeignKey('businesses.id'), nullable=True)
    business        = db.relationship('Business', back_populates='admin_user')
    branch_id       = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=True)
    branch          = db.relationship('Branch', back_populates='users')
    is_agency_admin = db.Column(db.Boolean, default=False)
    agency_id       = db.Column(db.Integer, db.ForeignKey('agencies.id'), nullable=True)
    agency          = db.relationship('Agency', backref='admin_users', foreign_keys=[agency_id])

class Employee(db.Model):
    __tablename__ = 'employees'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(150), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=False)
    business_id = db.Column(db.Integer, db.ForeignKey('businesses.id'), nullable=False)
    roles = db.relationship('Role', secondary=employee_roles, lazy='subquery', backref=db.backref('employees', lazy=True))
    def to_dict(self):
        return {'id': self.id, 'username': self.username, 'full_name': self.full_name,
                'phone': self.phone, 'branch_id': self.branch_id, 'business_id': self.business_id,
                'is_active': self.is_active, 'roles': [r.name for r in self.roles]}

class Branch(db.Model):
    __tablename__ = 'branches'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(255), nullable=True)
    business_id = db.Column(db.Integer, db.ForeignKey('businesses.id'), nullable=False)
    folio_prefix = db.Column(db.String(20), nullable=True, default='')
    folio_counter = db.Column(db.Integer, nullable=False, default=0)
    # Per-branch config (NULL = inherit from business)
    uses_iva = db.Column(db.Boolean, nullable=True)
    payment_cash = db.Column(db.Boolean, nullable=True)
    payment_card = db.Column(db.Boolean, nullable=True)
    payment_points = db.Column(db.Boolean, nullable=True)
    allow_deferred = db.Column(db.Boolean, nullable=True)
    points_per_peso = db.Column(db.Float, nullable=True)
    peso_per_point = db.Column(db.Float, nullable=True)
    discount_enabled = db.Column(db.Boolean, nullable=True)
    max_discount_pct = db.Column(db.Float, nullable=True)
    normal_days = db.Column(db.Integer, nullable=True)
    urgent_days = db.Column(db.Integer, nullable=True)
    extra_urgent_days = db.Column(db.Integer, nullable=True)
    urgent_pct = db.Column(db.Float, nullable=True)
    extra_urgent_pct = db.Column(db.Float, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    require_scan = db.Column(db.Boolean, nullable=False, default=True, server_default='true')
    users = db.relationship('Admin', back_populates='branch', lazy=True)

    def get_config(self):
        """Returns branch config, falling back to business config for NULL values."""
        biz = Business.query.get(self.business_id)
        def cv(branch_val, biz_val): return branch_val if branch_val is not None else biz_val
        return {
            'uses_iva': cv(self.uses_iva, biz.uses_iva if biz else True),
            'payment_cash': cv(self.payment_cash, biz.payment_cash if biz else True),
            'payment_card': cv(self.payment_card, biz.payment_card if biz else True),
            'payment_points': cv(self.payment_points, biz.payment_points if biz else False),
            'allow_deferred': cv(self.allow_deferred, biz.allow_deferred if biz else True),
            'points_per_peso': cv(self.points_per_peso, biz.points_per_peso if biz else 1.0),
            'peso_per_point': cv(self.peso_per_point, biz.peso_per_point if biz else 1.0),
            'discount_enabled': cv(self.discount_enabled, biz.discount_enabled if biz else True),
            'max_discount_pct': cv(self.max_discount_pct, biz.max_discount_pct if biz else 50.0),
            'normal_days': cv(self.normal_days, biz.normal_days if biz else 3),
            'urgent_days': cv(self.urgent_days, biz.urgent_days if biz else 1),
            'extra_urgent_days': cv(self.extra_urgent_days, biz.extra_urgent_days if biz else 0),
            'urgent_pct': cv(self.urgent_pct, biz.urgent_pct if biz else 20.0),
            'extra_urgent_pct': cv(self.extra_urgent_pct, biz.extra_urgent_pct if biz else 50.0),
            'require_scan': self.require_scan if self.require_scan is not None else True,
        }

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name, 'address': self.address,
            'business_id': self.business_id,
            'folio_prefix': self.folio_prefix or '',
            'folio_counter': self.folio_counter or 0,
            'is_active': self.is_active,
        }

class Client(db.Model):
    __tablename__ = 'clients'
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(150), nullable=False)
    last_name = db.Column(db.String(150), nullable=True)
    street_and_number = db.Column(db.String(255), nullable=True)
    neighborhood = db.Column(db.String(100), nullable=True)
    zip_code = db.Column(db.String(20), nullable=True)
    phone = db.Column(db.String(20), nullable=False, index=True)
    email = db.Column(db.String(120), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    date_of_birth_day = db.Column(db.Integer, nullable=True)
    date_of_birth_month = db.Column(db.Integer, nullable=True)
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=True)
    branch = db.relationship('Branch', backref='registered_clients', lazy=True)
    client_type_id = db.Column(db.Integer, db.ForeignKey('client_types.id'), nullable=True)
    client_type = db.relationship('ClientType', backref='clients', lazy=True)
    username = db.Column(db.String(80), unique=True, nullable=True)
    password = db.Column(db.String(255), nullable=True)
    points_balance = db.Column(db.Float, nullable=False, default=0.0)
    whatsapp_consent = db.Column(db.Boolean, nullable=False, default=False)
    email_consent = db.Column(db.Boolean, nullable=False, default=False)
    __table_args__ = (db.UniqueConstraint('phone', name='_phone_uc'),)
    def to_dict(self):
        return {'id': self.id, 'full_name': self.full_name, 'last_name': self.last_name,
                'phone': self.phone, 'email': self.email, 'notes': self.notes,
                'street_and_number': self.street_and_number, 'neighborhood': self.neighborhood,
                'zip_code': self.zip_code, 'date_of_birth_day': self.date_of_birth_day,
                'date_of_birth_month': self.date_of_birth_month, 'branch_id': self.branch_id,
                'client_type_id': self.client_type_id,
                'client_type_name': self.client_type.name if self.client_type else None,
                'username': self.username,
                'points_balance': self.points_balance,
                'whatsapp_consent': self.whatsapp_consent,
                'email_consent': self.email_consent,
                'has_portal_access': bool(self.username and self.password)}

class ClientType(db.Model):
    __tablename__ = 'client_types'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(60), nullable=False)
    business_id = db.Column(db.Integer, db.ForeignKey('businesses.id'), nullable=False)
    __table_args__ = (db.UniqueConstraint('name', 'business_id', name='_client_type_business_uc'),)
    def to_dict(self): return {'id': self.id, 'name': self.name, 'business_id': self.business_id}

class ClientDiscount(db.Model):
    __tablename__ = 'client_discounts'
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    discount_pct = db.Column(db.Float, nullable=False)
    reason = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    client = db.relationship('Client', backref='discounts', lazy=True)
    def to_dict(self):
        return {'id': self.id, 'client_id': self.client_id,
                'discount_pct': self.discount_pct, 'reason': self.reason,
                'created_at': self.created_at.isoformat() if self.created_at else None}

class PromoRequiredLine(db.Model):
    __tablename__ = 'promo_required_lines'
    id = db.Column(db.Integer, primary_key=True)
    promo_id = db.Column(db.Integer, db.ForeignKey('promotions.id', ondelete='CASCADE'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('items.id', ondelete='CASCADE'), nullable=True)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id', ondelete='CASCADE'), nullable=True)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    item = db.relationship('Item', lazy=True)
    category = db.relationship('Category', lazy=True)
    def to_dict(self):
        return {'id': self.id, 'item_id': self.item_id,
                'item_name': self.item.name if self.item else None,
                'category_id': self.category_id,
                'category_name': self.category.name if self.category else None,
                'quantity': self.quantity}

class PromoRewardLine(db.Model):
    __tablename__ = 'promo_reward_lines'
    id = db.Column(db.Integer, primary_key=True)
    promo_id = db.Column(db.Integer, db.ForeignKey('promotions.id', ondelete='CASCADE'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('items.id', ondelete='CASCADE'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    item = db.relationship('Item', lazy=True)
    def to_dict(self):
        return {'id': self.id, 'item_id': self.item_id,
                'item_name': self.item.name if self.item else None,
                'quantity': self.quantity}

class Promotion(db.Model):
    __tablename__ = 'promotions'
    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey('businesses.id'), nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=True)  # NULL = all branches
    client_type_id = db.Column(db.Integer, db.ForeignKey('client_types.id'), nullable=True)
    service_id = db.Column(db.Integer, db.ForeignKey('services.id'), nullable=True)
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    promo_type = db.Column(db.String(20), nullable=False, default='bundle_price')
    bundle_price = db.Column(db.Float, nullable=True)
    discount_pct = db.Column(db.Float, nullable=True)
    active = db.Column(db.Boolean, default=True, nullable=False)
    starts_at = db.Column(db.DateTime, nullable=True)
    ends_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    client_type = db.relationship('ClientType', backref='promotions', lazy=True)
    service = db.relationship('Service', lazy=True)
    required_lines = db.relationship('PromoRequiredLine', backref='promotion', lazy=True,
                                     cascade='all, delete-orphan',
                                     foreign_keys='PromoRequiredLine.promo_id')
    reward_lines = db.relationship('PromoRewardLine', backref='promotion', lazy=True,
                                   cascade='all, delete-orphan',
                                   foreign_keys='PromoRewardLine.promo_id')
    def is_valid_now(self):
        now = datetime.utcnow()
        if self.starts_at and now < self.starts_at: return False
        if self.ends_at and now > self.ends_at: return False
        return self.active
    def to_dict(self):
        return {'id': self.id, 'business_id': self.business_id,
                'branch_id': self.branch_id,
                'client_type_id': self.client_type_id,
                'client_type_name': self.client_type.name if self.client_type else None,
                'service_id': self.service_id,
                'service_name': self.service.name if self.service else None,
                'title': self.title, 'description': self.description,
                'promo_type': self.promo_type,
                'bundle_price': self.bundle_price,
                'discount_pct': self.discount_pct,
                'active': self.active,
                'starts_at': self.starts_at.isoformat() if self.starts_at else None,
                'ends_at': self.ends_at.isoformat() if self.ends_at else None,
                'created_at': self.created_at.isoformat() if self.created_at else None,
                'required_lines': [l.to_dict() for l in self.required_lines],
                'reward_lines': [l.to_dict() for l in self.reward_lines]}

class Service(db.Model):
    __tablename__ = 'services'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    categories = db.relationship('Category', backref='service', lazy=True)
    def to_dict(self): return {'id': self.id, 'name': self.name}

class Category(db.Model):
    __tablename__ = 'categories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey('services.id'), nullable=False)
    items = db.relationship('Item', backref='category', lazy=True)
    __table_args__ = (db.UniqueConstraint('name', 'service_id', name='_category_service_uc'),)
    def to_dict(self): return {'id': self.id, 'name': self.name, 'service_id': self.service_id}

class Item(db.Model):
    __tablename__ = 'items'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    price = db.Column(db.Float, nullable=False)
    units = db.Column(db.Integer, nullable=False, default=1)
    description = db.Column(db.String(255), nullable=True)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False)
    business_id = db.Column(db.Integer, db.ForeignKey('businesses.id'), nullable=True)
    order_items = db.relationship('OrderItem', backref='product_service', lazy=True, cascade="all, delete-orphan")
    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'price': self.price,
                'units': self.units, 'description': self.description,
                'category_id': self.category_id, 'business_id': self.business_id}

class Order(db.Model):
    __tablename__ = 'orders'
    id = db.Column(db.Integer, primary_key=True)
    order_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    status = db.Column(db.String(50), nullable=False, default='Creada')
    notes = db.Column(db.Text, nullable=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=False)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    subtotal = db.Column(Numeric(10, 2), nullable=False, default=0.00)
    discount = db.Column(Numeric(10, 2), nullable=False, default=0.00)
    tax = db.Column(Numeric(10, 2), nullable=False, default=0.00)
    total_amount = db.Column(Numeric(10, 2), nullable=False, default=0.00)
    payment_status = db.Column(db.String(20), nullable=False, default='pending')
    amount_paid = db.Column(Numeric(10, 2), nullable=False, default=0.00)
    folio = db.Column(db.String(30), nullable=True)
    urgency = db.Column(db.String(20), nullable=False, default='normal')
    delivery_date = db.Column(db.DateTime, nullable=True)
    carousel_position = db.Column(db.String(30), nullable=True)
    created_by_name = db.Column(db.String(100), nullable=True)
    delivered_at = db.Column(db.DateTime, nullable=True)
    order_items = db.relationship('OrderItem', backref='order', lazy=True, cascade="all, delete-orphan")
    payments = db.relationship('OrderPayment', backref='order', lazy=True, cascade="all, delete-orphan")
    garment_tickets = db.relationship('OrderGarmentTicket', backref='order', lazy=True, cascade="all, delete-orphan")
    client = db.relationship('Client', backref='orders', lazy=True)
    branch = db.relationship('Branch', backref='orders_taken', lazy=True)
    employee = db.relationship('Employee', backref='orders_created', lazy=True)
    def to_dict(self):
        client_name = None
        if self.client:
            client_name = self.client.full_name
            if self.client.last_name:
                client_name += f" {self.client.last_name}"
        return {'id': self.id, 'client_id': self.client_id, 'branch_id': self.branch_id,
                'client_name': client_name,
                'employee_id': self.employee_id, 'order_date': self.order_date.isoformat() + 'Z',
                'status': self.status, 'notes': self.notes, 'subtotal': str(self.subtotal),
                'discount': str(self.discount), 'tax': str(self.tax), 'total_amount': str(self.total_amount),
                'payment_status': self.payment_status, 'amount_paid': str(self.amount_paid),
                'folio': self.folio, 'urgency': self.urgency,
                'delivery_date': self.delivery_date.isoformat() if self.delivery_date else None,
                'delivered_at': self.delivered_at.isoformat() if self.delivered_at else None,
                'carousel_position': self.carousel_position,
                'created_by_name': self.created_by_name,
                'items': [item.to_dict() for item in self.order_items],
                'payments': [p.to_dict() for p in self.payments],
                'garment_tickets': [t.to_dict() for t in self.garment_tickets]}

class MonthlyGoal(db.Model):
    __tablename__ = 'monthly_goals'
    id          = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey('businesses.id'), nullable=False)
    branch_id   = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=True)
    year        = db.Column(db.Integer, nullable=False)
    month       = db.Column(db.Integer, nullable=False)
    goal_amount = db.Column(Numeric(12, 2), nullable=False, default=0)
    __table_args__ = (db.UniqueConstraint('business_id', 'branch_id', 'year', 'month', name='uq_goal'),)

    def to_dict(self):
        return {
            'id': self.id,
            'business_id': self.business_id,
            'branch_id': self.branch_id,
            'year': self.year,
            'month': self.month,
            'goal_amount': str(self.goal_amount),
        }


class WhatsappTemplate(db.Model):
    __tablename__ = 'whatsapp_templates'
    id           = db.Column(db.Integer, primary_key=True)
    business_id  = db.Column(db.Integer, db.ForeignKey('businesses.id'), nullable=False)
    trigger_type = db.Column(db.String(50), nullable=False)
    message_body = db.Column(db.Text, nullable=False)
    is_active    = db.Column(db.Boolean, nullable=False, default=True)
    created_at   = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at   = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('business_id', 'trigger_type', name='uq_whatsapp_template_business_trigger'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'business_id': self.business_id,
            'trigger_type': self.trigger_type,
            'message_body': self.message_body,
            'is_active': self.is_active,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class Expense(db.Model):
    __tablename__ = 'expenses'
    id           = db.Column(db.Integer, primary_key=True)
    business_id  = db.Column(db.Integer, db.ForeignKey('businesses.id'), nullable=False)
    branch_id    = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=False)
    expense_date = db.Column(db.Date, nullable=False)
    category     = db.Column(db.String(50), nullable=False)
    item_name    = db.Column(db.String(120), nullable=False)
    quantity     = db.Column(Numeric(10, 3), nullable=False, default=1)
    unit         = db.Column(db.String(20), nullable=False, default='pzas')
    unit_cost    = db.Column(Numeric(10, 2), nullable=False, default=0)
    total_cost   = db.Column(Numeric(12, 2), nullable=False, default=0)
    notes        = db.Column(db.Text, nullable=True)
    created_by   = db.Column(db.String(120), nullable=False)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'business_id': self.business_id,
            'branch_id': self.branch_id,
            'expense_date': self.expense_date.isoformat() if self.expense_date else None,
            'category': self.category,
            'item_name': self.item_name,
            'quantity': str(self.quantity),
            'unit': self.unit,
            'unit_cost': str(self.unit_cost),
            'total_cost': str(self.total_cost),
            'notes': self.notes,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class CashCut(db.Model):
    __tablename__ = 'cash_cuts'
    id           = db.Column(db.Integer, primary_key=True)
    branch_id    = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=False)
    business_id  = db.Column(db.Integer, db.ForeignKey('businesses.id'), nullable=False)
    cut_by       = db.Column(db.String(120), nullable=False)
    cut_at       = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    period_from  = db.Column(db.DateTime, nullable=True)
    period_to    = db.Column(db.DateTime, nullable=False)
    orders_count = db.Column(db.Integer, default=0)
    expected_cash= db.Column(Numeric(10, 2), default=0)
    counted_cash = db.Column(Numeric(10, 2), default=0)
    difference   = db.Column(Numeric(10, 2), default=0)
    card_total   = db.Column(Numeric(10, 2), default=0)
    points_total = db.Column(Numeric(10, 2), default=0)
    notes        = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'branch_id': self.branch_id,
            'business_id': self.business_id,
            'cut_by': self.cut_by,
            'cut_at': self.cut_at.isoformat() if self.cut_at else None,
            'period_from': self.period_from.isoformat() if self.period_from else None,
            'period_to': self.period_to.isoformat() if self.period_to else None,
            'orders_count': self.orders_count,
            'expected_cash': str(self.expected_cash),
            'counted_cash': str(self.counted_cash),
            'difference': str(self.difference),
            'card_total': str(self.card_total),
            'points_total': str(self.points_total),
            'notes': self.notes,
        }


class OrderPayment(db.Model):
    __tablename__ = 'order_payments'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    method = db.Column(db.String(20), nullable=False)
    amount = db.Column(Numeric(10, 2), nullable=False)
    points_used = db.Column(db.Float, nullable=True, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    def to_dict(self):
        return {'id': self.id, 'order_id': self.order_id, 'method': self.method,
                'amount': str(self.amount), 'points_used': self.points_used,
                'created_at': self.created_at.isoformat() if self.created_at else None}

class OrderItem(db.Model):
    __tablename__ = 'order_items'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    product_service_id = db.Column(db.Integer, db.ForeignKey('items.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(Numeric(10, 2), nullable=False)
    line_total = db.Column(Numeric(10, 2), nullable=False)
    def to_dict(self):
        product_name = self.product_service.name if self.product_service else 'Producto Eliminado'
        service_name = None
        if self.product_service and self.product_service.category and self.product_service.category.service:
            service_name = self.product_service.category.service.name
        units = self.product_service.units if self.product_service else 1
        return {'id': self.id, 'order_id': self.order_id, 'product_service_id': self.product_service_id,
                'product_name': product_name, 'service_name': service_name, 'quantity': self.quantity,
                'units': units, 'total_pieces': self.quantity * (units or 1),
                'unit_price': str(self.unit_price), 'line_total': str(self.line_total)}

class OrderGarmentTicket(db.Model):
    __tablename__ = 'order_garment_tickets'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    ticket_code = db.Column(db.String(40), unique=True, nullable=False)
    item_name = db.Column(db.String(100), nullable=False)
    quantity_index = db.Column(db.Integer, nullable=False)
    scanned = db.Column(db.Boolean, nullable=False, default=False)
    scanned_at = db.Column(db.DateTime, nullable=True)
    def to_dict(self):
        return {'id': self.id, 'order_id': self.order_id, 'ticket_code': self.ticket_code,
                'item_name': self.item_name, 'quantity_index': self.quantity_index,
                'scanned': self.scanned, 'scanned_at': self.scanned_at.isoformat() if self.scanned_at else None}

# --- COMANDOS CLI ---
@app.cli.command("seed_database")
def seed_database():
    if not Role.query.first():
        roles = [Role(name="Gerente", description="Supervisor"),
                 Role(name="Cajero", description="Cajero"),
                 Role(name="Colaborador", description="Soporte")]
        db.session.add_all(roles)
        db.session.commit()
    if not Service.query.first():
        tintoreria = Service(name="Tintorería")
        planchado = Service(name="Planchado")
        sastreria = Service(name="Sastrería")
        miscelanea = Service(name="Miscelánea")
        db.session.add_all([tintoreria, planchado, sastreria, miscelanea])
        db.session.commit()
        db.session.add_all([
            Category(name="Trajes", service=tintoreria),
            Category(name="Camisas", service=planchado),
            Category(name="Vestidos", service=tintoreria),
            Category(name="Pantalones", service=planchado)
        ])
        db.session.commit()

# --- PARSERS ---
login_parser = reqparse.RequestParser()
login_parser.add_argument('username', required=True)
login_parser.add_argument('password', required=True)

category_parser = reqparse.RequestParser()
category_parser.add_argument('name', required=True)
category_put_args = reqparse.RequestParser()
category_put_args.add_argument('name', required=True)

item_parser = reqparse.RequestParser()
item_parser.add_argument('name', required=True)
item_parser.add_argument('description')
item_parser.add_argument('price', type=float, required=True)
item_parser.add_argument('units', type=int, default=1)
item_parser.add_argument('business_id', type=int)

branch_parser = reqparse.RequestParser()
branch_parser.add_argument('name', required=True, location='json')
branch_parser.add_argument('address', required=False, location='json')

client_parser = reqparse.RequestParser()
client_parser.add_argument('first_name', location='json')
client_parser.add_argument('last_name', location='json')
client_parser.add_argument('phone', location='json')
client_parser.add_argument('email', location='json')
client_parser.add_argument('notes', location='json')
client_parser.add_argument('date_of_birth_day', type=int, location='json')
client_parser.add_argument('date_of_birth_month', type=int, location='json')
client_parser.add_argument('street_number', location='json')
client_parser.add_argument('neighborhood', location='json')
client_parser.add_argument('zip_code', location='json')

employee_parser = reqparse.RequestParser(bundle_errors=True)
employee_parser.add_argument('base_username', required=True, location='json')
employee_parser.add_argument('password', required=True, location='json')
employee_parser.add_argument('full_name', required=True, location='json')
employee_parser.add_argument('phone', location='json')
employee_parser.add_argument('branch_id', type=int, required=True, location='json')
employee_parser.add_argument('role_ids', type=int, action='append', required=True, location='json')

order_data_parser = reqparse.RequestParser(bundle_errors=True)
order_data_parser.add_argument('client_id', type=int, required=True, location='json')
order_data_parser.add_argument('notes', location='json')
order_data_parser.add_argument('discount_amount', type=float, default=0.0, location='json')

# --- RECURSOS ---
class AdminRegistration(Resource):
    @super_admin_required()
    def post(self):
        data = request.get_json()
        if Admin.query.filter_by(username=data.get('username')).first():
            return {"message": "El nombre de usuario ya existe"}, 409
        db.session.add(Admin(username=data.get('username'),
                             password=generate_password_hash(data.get('password')),
                             is_super_admin=True))
        db.session.commit()
        return {"message": "Administrador Super Admin creado exitosamente"}, 201

class BusinessCreation(Resource):
    @super_admin_required()
    def post(self):
        data = request.get_json()
        if Admin.query.filter_by(username=data.get('admin_username')).first():
            return {"message": "Admin user exists"}, 409
        if Business.query.filter_by(name=data.get('business_name')).first():
            return {"message": "Business exists"}, 409
        new_admin = Admin(username=data.get('admin_username'),
                          password=generate_password_hash(data.get('admin_password')),
                          is_super_admin=False)
        new_business = Business(name=(data.get('business_name') or '').title(),
                                address=(data.get('business_address') or '').title(),
                                phone=data.get('business_phone') or '',
                                email=data.get('business_email') or None,
                                vertical_type=data.get('vertical_type') or 'laundry',
                                admin_user=new_admin)
        try:
            db.session.add(new_business)
            db.session.commit()
            new_branch = Branch(name=f"Principal ({new_business.name})",
                                address=new_business.address,
                                business_id=new_business.id)
            db.session.add(new_branch)
            new_admin.branch_id = new_branch.id
            db.session.commit()
            return {"message": "Negocio creado", "business_id": new_business.id}, 201
        except Exception as e:
            db.session.rollback()
            return {"message": str(e)}, 500

class BusinessLogoResource(Resource):
    @jwt_required()
    def post(self, business_id):
        claims = get_jwt()
        if not claims.get("is_super_admin") and claims.get("business_id") != business_id:
            return {"message": "Permiso denegado"}, 403
        if claims.get("role") not in ("business_admin", "super_admin"):
            return {"message": "Solo el administrador puede cambiar esto"}, 403
        business = Business.query.get_or_404(business_id)
        if 'logo' not in request.files:
            return {"message": "No se recibió ninguna imagen"}, 400
        file = request.files['logo']
        if file.filename == '':
            return {"message": "Nombre de archivo vacío"}, 400
        import base64, mimetypes
        ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else 'png'
        mime = mimetypes.types_map.get(f'.{ext}', 'image/png')
        data = file.read()
        if len(data) > 2 * 1024 * 1024:
            return {"message": "La imagen no puede superar 2 MB"}, 413
        b64 = base64.b64encode(data).decode('utf-8')
        business.portal_logo_url = f"data:{mime};base64,{b64}"
        db.session.commit()
        return {"message": "Logo guardado", "portal_logo_url": business.portal_logo_url[:50] + "..."}, 200

class BusinessPublicResource(Resource):
    def get(self, business_id):
        business = Business.query.get_or_404(business_id)
        return {
            "id": business.id,
            "name": business.name,
            "portal_primary_color": business.portal_primary_color or "#1976d2",
            "portal_bg_color": business.portal_bg_color or "#f5f5f5",
            "portal_slogan": business.portal_slogan,
            "portal_logo_url": business.portal_logo_url,
        }, 200

class BusinessResource(Resource):
    @super_admin_required()
    def get(self):
        return {"businesses": [b.to_dict(include_branches=True) for b in Business.query.options(joinedload(Business.branches)).order_by(Business.name).all()]}, 200

class BusinessByIdResource(Resource):
    @jwt_required()
    def get(self, business_id):
        claims = get_jwt()
        user_is_sa = claims.get('is_super_admin', False)
        user_business_id = claims.get('business_id')
        business = Business.query.get(business_id)
        if not business:
            return {"message": "Negocio no encontrado"}, 404
        if not user_is_sa and user_business_id != business_id:
            return {"message": "Acceso denegado"}, 403
        return business.to_dict(include_branches=False), 200

    @jwt_required()
    def put(self, business_id):
        claims = get_jwt()
        if not claims.get('is_super_admin') and claims.get('business_id') != business_id:
            return {"message": "Acceso denegado"}, 403
        if claims.get('role') not in ('business_admin', 'super_admin'):
            return {"message": "Solo el administrador del negocio puede editar esta información"}, 403
        business = Business.query.get_or_404(business_id)
        data = request.get_json() or {}
        fields = ['name', 'address', 'phone', 'email', 'rfc', 'curp', 'sime',
                  'street', 'ext_num', 'int_num', 'colonia', 'zip_code',
                  'alcaldia', 'city', 'regimen_fiscal']
        for f in fields:
            if f in data:
                setattr(business, f, data[f])
        db.session.commit()
        return business.to_dict(), 200

class BranchResource(Resource):
    @jwt_required()
    def post(self, business_id):
        claims = get_jwt()
        if not claims.get("is_super_admin") and claims.get('business_id') != business_id:
            return {"message": "Permiso denegado"}, 403
        args = branch_parser.parse_args()
        try:
            new_branch = Branch(name=args["name"].title(), address=(args.get("address") or "").title(), business_id=business_id)
            db.session.add(new_branch)
            db.session.commit()
            return {"message": "Sucursal creada", "branch": new_branch.to_dict()}, 201
        except Exception as e:
            db.session.rollback()
            return {"message": str(e)}, 500
    @jwt_required()
    def get(self, business_id):
        claims = get_jwt()
        if not claims.get("is_super_admin") and claims.get('business_id') != business_id:
            return {"message": "Acceso denegado"}, 403
        return {"branches": [b.to_dict() for b in Branch.query.filter_by(business_id=business_id).order_by(Branch.name).all()]}, 200

class BranchDetailResource(Resource):
    @jwt_required()
    def get(self, branch_id):
        branch = Branch.query.get_or_404(branch_id)
        claims = get_jwt()
        if not claims.get("is_super_admin") and branch.business_id != claims.get('business_id'):
            return {"message": "Acceso denegado"}, 403
        return branch.to_dict(), 200

    @jwt_required()
    def put(self, branch_id):
        branch = Branch.query.get_or_404(branch_id)
        claims = get_jwt()
        if not claims.get("is_super_admin") and branch.business_id != claims.get('business_id'):
            return {"message": "Acceso denegado"}, 403
        data = request.get_json() or {}
        if "name" in data and data["name"].strip():
            branch.name = data["name"].strip().title()
        if "address" in data:
            branch.address = data["address"].strip().title()
        db.session.commit()
        return branch.to_dict(), 200

class BusinessToggleResource(Resource):
    @jwt_required()
    def put(self, business_id):
        claims = get_jwt()
        if not claims.get('is_super_admin'):
            return {"message": "Solo super admin"}, 403
        business = Business.query.get_or_404(business_id)
        business.is_active = not business.is_active
        db.session.commit()
        return {"is_active": business.is_active}, 200

    @jwt_required()
    def delete(self, business_id):
        claims = get_jwt()
        if not claims.get('is_super_admin'):
            return {"message": "Solo super admin"}, 403
        business = Business.query.get_or_404(business_id)
        db.session.delete(business)
        db.session.commit()
        return {"message": "Negocio eliminado"}, 200

class BranchToggleResource(Resource):
    @jwt_required()
    def put(self, branch_id):
        claims = get_jwt()
        if not claims.get('is_super_admin'):
            return {"message": "Solo super admin"}, 403
        branch = Branch.query.get_or_404(branch_id)
        branch.is_active = not branch.is_active
        db.session.commit()
        return {"is_active": branch.is_active}, 200

    @jwt_required()
    def delete(self, branch_id):
        claims = get_jwt()
        if not claims.get('is_super_admin'):
            return {"message": "Solo super admin"}, 403
        branch = Branch.query.get_or_404(branch_id)
        db.session.delete(branch)
        db.session.commit()
        return {"message": "Sucursal eliminada"}, 200

class BusinessConfigResource(Resource):
    @jwt_required()
    def put(self, business_id):
        claims = get_jwt()
        if not claims.get("is_super_admin") and claims.get("business_id") != business_id:
            return {"message": "Permiso denegado"}, 403
        if claims.get("role") not in ("business_admin", "super_admin"):
            return {"message": "Solo el administrador del negocio puede cambiar esta configuración"}, 403
        business = Business.query.get_or_404(business_id)
        data = request.get_json() or {}
        if "uses_iva" in data:
            business.uses_iva = bool(data["uses_iva"])
        if "payment_cash" in data:
            business.payment_cash = bool(data["payment_cash"])
        if "payment_card" in data:
            business.payment_card = bool(data["payment_card"])
        if "payment_points" in data:
            business.payment_points = bool(data["payment_points"])
        if "allow_deferred" in data:
            business.allow_deferred = bool(data["allow_deferred"])
        if "points_per_peso" in data:
            business.points_per_peso = max(0.01, float(data["points_per_peso"]))
        if "peso_per_point" in data:
            business.peso_per_point = max(0.01, float(data["peso_per_point"]))
        if "discount_enabled" in data:
            business.discount_enabled = bool(data["discount_enabled"])
        if "max_discount_pct" in data:
            business.max_discount_pct = max(0, float(data["max_discount_pct"]))
        if "normal_days" in data:
            business.normal_days = max(0, int(data["normal_days"]))
        if "urgent_days" in data:
            business.urgent_days = max(0, int(data["urgent_days"]))
        if "extra_urgent_days" in data:
            business.extra_urgent_days = max(0, int(data["extra_urgent_days"]))
        if "urgent_pct" in data:
            business.urgent_pct = max(0, float(data["urgent_pct"]))
        if "extra_urgent_pct" in data:
            business.extra_urgent_pct = max(0, float(data["extra_urgent_pct"]))
        if "carousel_format_hint" in data:
            business.carousel_format_hint = data["carousel_format_hint"]
        if "require_scan" in data:
            business.require_scan = bool(data["require_scan"])
        for f in ("portal_primary_color", "portal_bg_color", "portal_slogan", "portal_logo_url"):
            if f in data:
                setattr(business, f, data[f])
        db.session.commit()
        return business.to_dict(), 200

class BusinessHoursResource(Resource):
    @jwt_required()
    def get(self, business_id):
        claims = get_jwt()
        branch_id = claims.get('branch_id') or claims.get('active_branch_id')
        if branch_id:
            hours = BusinessHour.query.filter_by(branch_id=branch_id).order_by(BusinessHour.day_of_week).all()
            if not hours:
                # Fall back to business-level hours
                hours = BusinessHour.query.filter_by(business_id=business_id, branch_id=None).order_by(BusinessHour.day_of_week).all()
        else:
            hours = BusinessHour.query.filter_by(business_id=business_id, branch_id=None).order_by(BusinessHour.day_of_week).all()
        return [h.to_dict() for h in hours], 200

    @jwt_required()
    def put(self, business_id):
        claims = get_jwt()
        if not claims.get("is_super_admin") and claims.get("business_id") != business_id:
            return {"message": "Permiso denegado"}, 403
        branch_id = claims.get('branch_id') or claims.get('active_branch_id')
        data = request.get_json() or []
        for item in data:
            dow = item.get('day_of_week')
            if branch_id:
                bh = BusinessHour.query.filter_by(branch_id=branch_id, day_of_week=dow).first()
                if not bh:
                    bh = BusinessHour(business_id=business_id, branch_id=branch_id, day_of_week=dow)
                    db.session.add(bh)
            else:
                bh = BusinessHour.query.filter_by(business_id=business_id, branch_id=None, day_of_week=dow).first()
                if not bh:
                    bh = BusinessHour(business_id=business_id, day_of_week=dow)
                    db.session.add(bh)
            bh.is_open = bool(item.get('is_open', True))
            if item.get('open_time'):
                h, m = item['open_time'].split(':')
                bh.open_time = dt_time(int(h), int(m))
            if item.get('close_time'):
                h, m = item['close_time'].split(':')
                bh.close_time = dt_time(int(h), int(m))
        db.session.commit()
        if branch_id:
            hours = BusinessHour.query.filter_by(branch_id=branch_id).order_by(BusinessHour.day_of_week).all()
        else:
            hours = BusinessHour.query.filter_by(business_id=business_id, branch_id=None).order_by(BusinessHour.day_of_week).all()
        return [h.to_dict() for h in hours], 200

OFFICIAL_HOLIDAYS = {
    'México': [
        {'name': 'Año Nuevo', 'month': 1, 'day': 1},
        {'name': 'Día de la Constitución', 'month': 2, 'day': 5},
        {'name': 'Natalicio de Benito Juárez', 'month': 3, 'day': 21},
        {'name': 'Día del Trabajo', 'month': 5, 'day': 1},
        {'name': 'Independencia de México', 'month': 9, 'day': 16},
        {'name': 'Revolución Mexicana', 'month': 11, 'day': 20},
        {'name': 'Navidad', 'month': 12, 'day': 25},
    ],
    'Estados Unidos': [
        {'name': 'New Year\'s Day', 'month': 1, 'day': 1},
        {'name': 'Independence Day', 'month': 7, 'day': 4},
        {'name': 'Christmas', 'month': 12, 'day': 25},
    ],
    'España': [
        {'name': 'Año Nuevo', 'month': 1, 'day': 1},
        {'name': 'Día del Trabajador', 'month': 5, 'day': 1},
        {'name': 'Navidad', 'month': 12, 'day': 25},
    ],
}

def _seed_official_holidays(business_id, branch_id=None):
    business = Business.query.get(business_id)
    country = (business.country or 'México').strip() if business else 'México'
    holidays_list = OFFICIAL_HOLIDAYS.get(country, OFFICIAL_HOLIDAYS['México'])
    for h in holidays_list:
        db.session.add(BusinessHoliday(
            business_id=business_id, branch_id=branch_id,
            name=h['name'], is_recurring=True,
            month=h['month'], day=h['day'], is_active=True,
        ))
    db.session.commit()

class BusinessHolidaysResource(Resource):
    @jwt_required()
    def get(self, business_id):
        claims = get_jwt()
        branch_id = claims.get('branch_id') or claims.get('active_branch_id')
        if branch_id:
            holidays = BusinessHoliday.query.filter_by(branch_id=branch_id).order_by(BusinessHoliday.id).all()
            if not holidays:
                _seed_official_holidays(business_id, branch_id)
                holidays = BusinessHoliday.query.filter_by(branch_id=branch_id).order_by(BusinessHoliday.id).all()
        else:
            holidays = BusinessHoliday.query.filter_by(business_id=business_id, branch_id=None).order_by(BusinessHoliday.id).all()
            if not holidays:
                _seed_official_holidays(business_id)
                holidays = BusinessHoliday.query.filter_by(business_id=business_id, branch_id=None).order_by(BusinessHoliday.id).all()
        return [h.to_dict() for h in holidays], 200

    @jwt_required()
    def post(self, business_id):
        claims = get_jwt()
        if not claims.get("is_super_admin") and claims.get("business_id") != business_id:
            return {"message": "Permiso denegado"}, 403
        branch_id = claims.get('branch_id') or claims.get('active_branch_id')
        data = request.get_json() or {}
        holiday = BusinessHoliday(
            business_id=business_id,
            branch_id=branch_id,
            name=data.get('name', 'Festivo'),
            is_recurring=bool(data.get('is_recurring', True)),
            month=data.get('month'), day=data.get('day'),
            specific_date=date.fromisoformat(data['specific_date']) if data.get('specific_date') else None,
            is_active=True,
        )
        db.session.add(holiday)
        db.session.commit()
        return holiday.to_dict(), 201

class BusinessHolidayResource(Resource):
    @jwt_required()
    def put(self, business_id, holiday_id):
        claims = get_jwt()
        if not claims.get("is_super_admin") and claims.get("business_id") != business_id:
            return {"message": "Permiso denegado"}, 403
        h = BusinessHoliday.query.get_or_404(holiday_id)
        data = request.get_json() or {}
        if 'is_active' in data:
            h.is_active = bool(data['is_active'])
        if 'name' in data:
            h.name = data['name']
        db.session.commit()
        return h.to_dict(), 200

    @jwt_required()
    def delete(self, business_id, holiday_id):
        claims = get_jwt()
        if not claims.get("is_super_admin") and claims.get("business_id") != business_id:
            return {"message": "Permiso denegado"}, 403
        h = BusinessHoliday.query.get_or_404(holiday_id)
        db.session.delete(h)
        db.session.commit()
        return {"message": "Eliminado"}, 200

class BranchConfigResource(Resource):
    @jwt_required()
    def get(self, branch_id):
        claims = get_jwt()
        branch = Branch.query.get_or_404(branch_id)
        if not claims.get('is_super_admin') and claims.get('business_id') != branch.business_id:
            return {"message": "Permiso denegado"}, 403
        cfg = branch.get_config()
        cfg['branch_id'] = branch_id
        cfg['folio_prefix'] = branch.folio_prefix or ''
        cfg['folio_counter'] = branch.folio_counter or 0
        return cfg, 200

    @jwt_required()
    def put(self, branch_id):
        claims = get_jwt()
        branch = Branch.query.get_or_404(branch_id)
        if not claims.get('is_super_admin') and claims.get('business_id') != branch.business_id:
            return {"message": "Permiso denegado"}, 403
        if claims.get('role') not in ('business_admin', 'branch_manager', 'super_admin'):
            return {"message": "Sin permiso"}, 403
        data = request.get_json() or {}
        bool_fields = ['uses_iva', 'payment_cash', 'payment_card', 'payment_points',
                       'allow_deferred', 'discount_enabled', 'require_scan']
        float_fields = ['points_per_peso', 'peso_per_point', 'max_discount_pct',
                        'urgent_pct', 'extra_urgent_pct']
        int_fields = ['normal_days', 'urgent_days', 'extra_urgent_days']
        for f in bool_fields:
            if f in data:
                setattr(branch, f, bool(data[f]) if data[f] is not None else None)
        for f in float_fields:
            if f in data:
                setattr(branch, f, float(data[f]) if data[f] is not None else None)
        for f in int_fields:
            if f in data:
                setattr(branch, f, int(data[f]) if data[f] is not None else None)
        db.session.commit()
        cfg = branch.get_config()
        cfg['branch_id'] = branch_id
        return cfg, 200

class BranchScanConfigResource(Resource):
    @jwt_required()
    def get(self, branch_id):
        claims = get_jwt()
        branch = Branch.query.get_or_404(branch_id)
        if not claims.get('is_super_admin') and claims.get('business_id') != branch.business_id:
            return {"message": "Permiso denegado"}, 403
        db.session.refresh(branch)
        val = branch.require_scan
        return {"require_scan": bool(val) if val is not None else True, "branch_id": branch_id}, 200

    @jwt_required()
    def put(self, branch_id):
        claims = get_jwt()
        branch = Branch.query.get_or_404(branch_id)
        if not claims.get('is_super_admin') and claims.get('business_id') != branch.business_id:
            return {"message": "Permiso denegado"}, 403
        data = request.get_json() or {}
        new_val = data.get('require_scan')
        branch.require_scan = bool(new_val) if new_val is not None else True
        db.session.commit()
        db.session.refresh(branch)
        return {"require_scan": bool(branch.require_scan), "branch_id": branch_id}, 200

class BranchFolioResource(Resource):
    @jwt_required()
    def put(self, branch_id):
        branch = Branch.query.get_or_404(branch_id)
        claims = get_jwt()
        allowed = {"business_admin", "branch_manager", "super_admin"}
        if claims.get("role") not in allowed or (not claims.get("is_super_admin") and branch.business_id != claims.get("business_id")):
            return {"message": "Permiso denegado"}, 403
        data = request.get_json() or {}
        if "folio_prefix" in data:
            branch.folio_prefix = str(data["folio_prefix"]).strip()[:20]
        if "folio_counter" in data:
            branch.folio_counter = max(0, int(data["folio_counter"]))
        db.session.commit()
        return branch.to_dict(), 200

    @jwt_required()
    def get(self, branch_id):
        branch = Branch.query.get_or_404(branch_id)
        claims = get_jwt()
        if not claims.get("is_super_admin") and branch.business_id != claims.get("business_id"):
            return {"message": "Acceso denegado"}, 403
        prefix = branch.folio_prefix or ""
        counter = (branch.folio_counter or 0) + 1
        folio = f"{prefix}{str(counter).zfill(4)}" if prefix else str(counter).zfill(4)
        return {"folio": folio, "prefix": prefix, "counter": counter}, 200

class RoleListResource(Resource):
    @jwt_required()
    def get(self):
        return {'roles': [role.to_dict() for role in Role.query.all()]}, 200

class EmployeeListResource(Resource):
    @jwt_required()
    def post(self):
        claims = get_jwt()
        allowed = {"business_admin", "branch_manager"}
        if claims.get("role") not in allowed:
            return {"message": "No tienes permiso para crear empleados"}, 403
        data = request.get_json()
        base_username = data.get('base_username')
        password = data.get('password')
        full_name = data.get('full_name')
        phone = data.get('phone')
        branch_id = data.get('branch_id')
        role_ids = data.get('role_ids', [])
        if not base_username or not base_username.strip():
            return {"message": "El nombre de usuario es requerido"}, 400
        if not password or not password.strip():
            return {"message": "La contraseña es requerida"}, 400
        if not full_name or not full_name.strip():
            return {"message": "El nombre completo es requerido"}, 400
        if not branch_id:
            return {"message": "La sucursal es requerida"}, 400
        if not role_ids or len(role_ids) == 0:
            return {"message": "Debes asignar al menos un rol al empleado"}, 400
        branch = Branch.query.get(branch_id)
        if not branch or (not claims.get('is_super_admin') and branch.business_id != claims.get('business_id')):
            return {"message": "Sucursal inválida"}, 403
        username = f"{base_username}@{branch.name}"
        if Employee.query.filter_by(username=username).first():
            return {"message": f"El usuario '{username}' ya existe"}, 409
        new_employee = Employee(username=username,
                                password=generate_password_hash(password),
                                full_name=full_name.title(),
                                phone=phone,
                                branch_id=branch_id,
                                business_id=branch.business_id)
        if role_ids:
            new_employee.roles.extend(Role.query.filter(Role.id.in_(role_ids)).all())
        try:
            db.session.add(new_employee)
            db.session.commit()
            return {"message": "Empleado creado", "employee": new_employee.to_dict()}, 201
        except Exception as e:
            db.session.rollback()
            return {"message": str(e)}, 500
    @jwt_required()
    def get(self):
        claims = get_jwt()
        query = Employee.query.options(joinedload(Employee.roles))
        if not claims.get("is_super_admin"):
            branch_id = claims.get('branch_id') or claims.get('active_branch_id')
            if branch_id:
                query = query.filter_by(branch_id=branch_id)
            else:
                query = query.filter_by(business_id=claims.get('business_id'))
        if request.args.get('include_inactive', 'false').lower() != 'true':
            query = query.filter_by(is_active=True)
        return {"employees": [e.to_dict() for e in query.all()]}, 200

class EmployeeResource(Resource):
    @jwt_required()
    def put(self, employee_id):
        claims = get_jwt()
        employee = Employee.query.get_or_404(employee_id)
        if not claims.get('is_super_admin') and employee.business_id != claims.get('business_id'):
            return {"message": "Acceso denegado"}, 403
        parser = reqparse.RequestParser()
        parser.add_argument('full_name')
        parser.add_argument('phone')
        parser.add_argument('branch_id', type=int)
        parser.add_argument('is_active', type=bool)
        parser.add_argument('role_ids', type=int, action='append')
        args = parser.parse_args()
        if args['full_name']:
            employee.full_name = args['full_name'].title()
        if args['phone']:
            employee.phone = args['phone']
        if args['branch_id']:
            employee.branch_id = args['branch_id']
        if args['is_active'] is not None:
            employee.is_active = args['is_active']
        if args['role_ids']:
            employee.roles = Role.query.filter(Role.id.in_(args['role_ids'])).all()
        db.session.commit()
        return {"message": "Empleado actualizado", "employee": employee.to_dict()}, 200
    @jwt_required()
    def delete(self, employee_id):
        claims = get_jwt()
        employee = Employee.query.get_or_404(employee_id)
        if not claims.get('is_super_admin') and employee.business_id != claims.get('business_id'):
            return {"message": "Acceso denegado"}, 403
        has_orders = Order.query.filter_by(employee_id=employee_id).first()
        if has_orders:
            return {"message": "No se puede eliminar: el empleado tiene órdenes registradas. Puedes desactivarlo en su lugar."}, 409
        try:
            db.session.delete(employee)
            db.session.commit()
            return {"message": "Empleado eliminado"}, 200
        except Exception as e:
            db.session.rollback()
            return {"message": str(e)}, 500

class EmployeePasswordResource(Resource):
    @jwt_required()
    def put(self, employee_id):
        data = request.get_json()
        new_password = (data or {}).get('password', '').strip()
        if not new_password:
            return {"message": "La contraseña no puede estar vacía"}, 400
        employee.password = generate_password_hash(new_password)
        db.session.commit()
        return {"message": "Contraseña actualizada"}, 200

class AdminPasswordResource(Resource):
    """Super admin resets a business owner password, or owner changes own password."""
    @jwt_required()
    def put(self, admin_id):
        claims = get_jwt()
        requester_id = int(get_jwt_identity())
        target = Admin.query.get_or_404(admin_id)
        # Super admin can reset anyone; owner can only reset themselves
        if not claims.get('is_super_admin') and requester_id != admin_id:
            return {"message": "Acceso denegado"}, 403
        data = request.get_json() or {}
        # If not super admin, require current password verification
        if not claims.get('is_super_admin'):
            current_pw = data.get('current_password', '').strip()
            if not current_pw or not check_password_hash(target.password, current_pw):
                return {"message": "Contraseña actual incorrecta"}, 401
        new_pw = data.get('password', '').strip()
        if not new_pw or len(new_pw) < 6:
            return {"message": "La contraseña debe tener al menos 6 caracteres"}, 400
        target.password = generate_password_hash(new_pw)
        db.session.commit()
        return {"message": "Contraseña actualizada"}, 200

class ClientPasswordResource(Resource):
    """Client changes own password from portal (requires current password)."""
    @jwt_required()
    def put(self):
        claims = get_jwt()
        if claims.get('user_type') != 'Client':
            return {"message": "Solo clientes"}, 403
        client = Client.query.get_or_404(int(get_jwt_identity()))
        data = request.get_json() or {}
        current = data.get('current_password', '').strip()
        new_pw = data.get('new_password', '').strip()
        if not current or not new_pw:
            return {"message": "Completa todos los campos"}, 400
        if len(new_pw) < 6:
            return {"message": "La nueva contraseña debe tener al menos 6 caracteres"}, 400
        if not client.password or not check_password_hash(client.password, current):
            return {"message": "Contraseña actual incorrecta"}, 401
        client.password = generate_password_hash(new_pw)
        db.session.commit()
        return {"message": "Contraseña actualizada"}, 200

class ServiceListResource(Resource):
    @jwt_required()
    def get(self):
        return {"services": [s.to_dict() for s in Service.query.all()]}, 200
    @super_admin_required()
    def post(self):
        args = reqparse.RequestParser().add_argument('name', required=True).parse_args()
        if Service.query.filter_by(name=args['name'].title()).first():
            return {"message": "Existe"}, 409
        new_service = Service(name=args['name'].title())
        db.session.add(new_service)
        db.session.commit()
        return {"message": "Creado", "id": new_service.id}, 201

class ServiceResource(Resource):
    @jwt_required()
    def get(self, service_id):
        return Service.query.get_or_404(service_id).to_dict(), 200
    @super_admin_required()
    def put(self, service_id):
        service = Service.query.get_or_404(service_id)
        service.name = request.get_json().get('name', service.name).title()
        db.session.commit()
        return service.to_dict(), 200
    @super_admin_required()
    def delete(self, service_id):
        service = Service.query.get_or_404(service_id)
        if service.categories:
            return {"message": f"No se puede eliminar: el servicio tiene {len(service.categories)} categoría(s) asociada(s). Elimínalas primero."}, 409
        try:
            db.session.delete(service)
            db.session.commit()
            return {"message": "Eliminado"}, 200
        except Exception as e:
            db.session.rollback()
            return {"message": f"Error al eliminar: {str(e)}"}, 500

class CategoryResource(Resource):
    @jwt_required()
    def get(self, service_id):
        service = Service.query.get_or_404(service_id)
        cats = Category.query.filter_by(service_id=service_id).order_by(Category.name).all()
        return {
            "service": {"id": service.id, "name": service.name},
            "categories": [{"id": c.id, "name": c.name, "service_id": c.service_id} for c in cats]
        }, 200
    @super_admin_required()
    def post(self, service_id):
        args = category_parser.parse_args()
        name = args['name'].title()
        if Category.query.filter_by(name=name, service_id=service_id).first():
            return {"message": "Existe"}, 409
        new_cat = Category(name=name, service_id=service_id)
        db.session.add(new_cat)
        db.session.commit()
        return {"message": "Creada", "id": new_cat.id}, 201

class CategoryByIdResource(Resource):
    @jwt_required()
    def get(self, category_id):
        return Category.query.get_or_404(category_id).to_dict(), 200
    @super_admin_required()
    def put(self, category_id):
        cat = Category.query.get_or_404(category_id)
        cat.name = category_put_args.parse_args()['name'].title()
        db.session.commit()
        return {"message": "Updated"}, 200
    @super_admin_required()
    def delete(self, category_id):
        cat = Category.query.get_or_404(category_id)
        Item.query.filter_by(category_id=category_id).delete()
        db.session.delete(cat)
        db.session.commit()
        return {"message": "Deleted"}, 200

class ItemResource(Resource):
    @jwt_required()
    def post(self, category_id):
        claims = get_jwt()
        args = item_parser.parse_args()
        business_id = None
        if claims.get('is_super_admin'):
            business_id = args.get('business_id')
        else:
            business_id = claims.get('business_id') or args.get('business_id')
        if not business_id and not claims.get('is_super_admin'):
            return {"message": "No se pudo determinar el negocio."}, 403
        new_item = Item(
            name=args['name'].title(),
            description=(args.get('description') or '').title(),
            price=args['price'],
            units=args['units'],
            category_id=category_id,
            business_id=business_id,
        )
        try:
            db.session.add(new_item)
            db.session.commit()
            return {"message": "Creado", "id": new_item.id}, 201
        except Exception as e:
            db.session.rollback()
            return {"message": str(e)}, 500

    @jwt_required()
    def get(self, category_id):
        claims = get_jwt()
        category = Category.query.get_or_404(category_id)
        query = Item.query.filter(Item.category_id == category_id)
        if not claims.get('is_super_admin'):
            business_id = claims.get('business_id')
            query = query.filter(
                db.or_(Item.business_id == business_id, Item.business_id.is_(None))
            )
        return {
            "category_name": category.name,
            "items": [i.to_dict() for i in query.order_by(Item.name).all()]
        }, 200

class ItemDetailResource(Resource):
    @jwt_required()
    def get(self, item_id):
        return Item.query.get_or_404(item_id).to_dict(), 200

    @jwt_required()
    def put(self, item_id):
        item = Item.query.get_or_404(item_id)
        data = request.get_json() or {}
        print(f"[PUT /items/{item_id}] data recibida: {data}", flush=True)
        if data.get('name'):
            item.name = data['name'].strip().title()
        if data.get('price') is not None:
            item.price = float(data['price'])
        if 'description' in data:
            item.description = (data['description'] or '').strip().title() or None
        if 'units' in data:
            item.units = int(data['units'])
        try:
            db.session.commit()
            print(f"[PUT /items/{item_id}] guardado OK: name={item.name} price={item.price}", flush=True)
        except Exception as e:
            db.session.rollback()
            print(f"[PUT /items/{item_id}] ERROR commit: {e}", flush=True)
            return {"message": str(e)}, 500
        return item.to_dict(), 200

    @jwt_required()
    def delete(self, item_id):
        item = Item.query.get_or_404(item_id)
        db.session.delete(item)
        db.session.commit()
        return {"message": "Artículo eliminado"}, 200

class ClientTypeListResource(Resource):
    @jwt_required()
    def get(self):
        claims = get_jwt()
        business_id = claims.get('business_id')
        if not business_id:
            return {"message": "Sin negocio asociado"}, 403
        types = ClientType.query.filter_by(business_id=business_id).order_by(ClientType.name).all()
        return {"client_types": [t.to_dict() for t in types]}, 200

    @jwt_required()
    def post(self):
        claims = get_jwt()
        if claims.get('role') not in ('business_admin', 'branch_manager', 'super_admin'):
            return {"message": "Sin permiso"}, 403
        business_id = claims.get('business_id')
        data = request.get_json() or {}
        name = (data.get('name') or '').strip().title()
        if not name:
            return {"message": "Nombre requerido"}, 400
        if ClientType.query.filter_by(name=name, business_id=business_id).first():
            return {"message": "Ya existe ese tipo de cliente"}, 409
        ct = ClientType(name=name, business_id=business_id)
        db.session.add(ct)
        db.session.commit()
        return ct.to_dict(), 201

class ClientTypeResource(Resource):
    @jwt_required()
    def delete(self, type_id):
        claims = get_jwt()
        ct = ClientType.query.get_or_404(type_id)
        if claims.get('business_id') != ct.business_id and not claims.get('is_super_admin'):
            return {"message": "Sin permiso"}, 403
        db.session.delete(ct)
        db.session.commit()
        return {"message": "Tipo eliminado"}, 200

class ClientDiscountListResource(Resource):
    @jwt_required()
    def get(self, client_id):
        discounts = ClientDiscount.query.filter_by(client_id=client_id).order_by(ClientDiscount.created_at.desc()).all()
        return {"discounts": [d.to_dict() for d in discounts]}, 200

    @jwt_required()
    def post(self, client_id):
        claims = get_jwt()
        if claims.get('role') not in ('business_admin', 'branch_manager', 'super_admin'):
            return {"message": "Sin permiso"}, 403
        data = request.get_json() or {}
        pct = data.get('discount_pct')
        if pct is None or float(pct) <= 0 or float(pct) > 100:
            return {"message": "Descuento inválido (1-100)"}, 400
        d = ClientDiscount(client_id=client_id, discount_pct=float(pct), reason=(data.get('reason') or '').strip() or None)
        db.session.add(d)
        db.session.commit()
        return d.to_dict(), 201

class ClientDiscountResource(Resource):
    @jwt_required()
    def delete(self, client_id, discount_id):
        claims = get_jwt()
        if claims.get('role') not in ('business_admin', 'branch_manager', 'super_admin'):
            return {"message": "Sin permiso"}, 403
        d = ClientDiscount.query.get_or_404(discount_id)
        db.session.delete(d)
        db.session.commit()
        return {"message": "Descuento eliminado"}, 200

class PromotionListResource(Resource):
    @jwt_required()
    def get(self):
        claims = get_jwt()
        business_id = claims.get('business_id')
        branch_id = claims.get('branch_id')
        active_only = request.args.get('active_only') == '1'
        q = Promotion.query.filter_by(business_id=business_id)
        # Return promos for all branches + promos specific to this branch
        if branch_id:
            q = q.filter(db.or_(Promotion.branch_id.is_(None), Promotion.branch_id == branch_id))
        q = q.order_by(Promotion.created_at.desc())
        promos = q.all()
        if active_only:
            promos = [p for p in promos if p.is_valid_now()]
        return {"promotions": [p.to_dict() for p in promos]}, 200

    @jwt_required()
    def post(self):
        claims = get_jwt()
        if claims.get('role') not in ('business_admin', 'branch_manager', 'super_admin'):
            return {"message": "Sin permiso"}, 403
        business_id = claims.get('business_id')
        data = request.get_json() or {}
        title = (data.get('title') or '').strip()
        if not title:
            return {"message": "Título requerido"}, 400
        promo_type = data.get('promo_type', 'bundle_price')
        starts_at = datetime.fromisoformat(data['starts_at']) if data.get('starts_at') else None
        ends_at = datetime.fromisoformat(data['ends_at']) if data.get('ends_at') else None
        # branch_id: None = all branches, specific id = one branch
        promo_branch_id = data.get('branch_id') or None
        p = Promotion(
            business_id=business_id,
            branch_id=promo_branch_id,
            client_type_id=data.get('client_type_id') or None,
            service_id=data.get('service_id') or None,
            title=title,
            description=(data.get('description') or '').strip() or None,
            promo_type=promo_type,
            bundle_price=float(data['bundle_price']) if data.get('bundle_price') else None,
            discount_pct=float(data['discount_pct']) if data.get('discount_pct') else None,
            active=bool(data.get('active', True)),
            starts_at=starts_at,
            ends_at=ends_at,
        )
        db.session.add(p)
        db.session.flush()
        for line in (data.get('required_lines') or []):
            db.session.add(PromoRequiredLine(
                promo_id=p.id,
                item_id=line.get('item_id') or None,
                category_id=line.get('category_id') or None,
                quantity=int(line.get('quantity', 1)),
            ))
        for line in (data.get('reward_lines') or []):
            db.session.add(PromoRewardLine(
                promo_id=p.id,
                item_id=line['item_id'],
                quantity=int(line.get('quantity', 1)),
            ))
        db.session.commit()
        return p.to_dict(), 201

class PromotionResource(Resource):
    @jwt_required()
    def put(self, promo_id):
        claims = get_jwt()
        if claims.get('role') not in ('business_admin', 'branch_manager', 'super_admin'):
            return {"message": "Sin permiso"}, 403
        p = Promotion.query.get_or_404(promo_id)
        data = request.get_json() or {}
        for f in ['title', 'description']:
            if f in data:
                setattr(p, f, (data[f] or '').strip() or None)
        if 'active' in data: p.active = bool(data['active'])
        if 'client_type_id' in data: p.client_type_id = data['client_type_id'] or None
        if 'service_id' in data: p.service_id = data['service_id'] or None
        if 'bundle_price' in data: p.bundle_price = float(data['bundle_price']) if data['bundle_price'] else None
        if 'discount_pct' in data: p.discount_pct = float(data['discount_pct']) if data['discount_pct'] else None
        if 'starts_at' in data: p.starts_at = datetime.fromisoformat(data['starts_at']) if data['starts_at'] else None
        if 'ends_at' in data: p.ends_at = datetime.fromisoformat(data['ends_at']) if data['ends_at'] else None
        if 'required_lines' in data:
            PromoRequiredLine.query.filter_by(promo_id=p.id).delete()
            for line in (data['required_lines'] or []):
                db.session.add(PromoRequiredLine(promo_id=p.id, item_id=line.get('item_id') or None,
                    category_id=line.get('category_id') or None, quantity=int(line.get('quantity', 1))))
        if 'reward_lines' in data:
            PromoRewardLine.query.filter_by(promo_id=p.id).delete()
            for line in (data['reward_lines'] or []):
                db.session.add(PromoRewardLine(promo_id=p.id, item_id=line['item_id'],
                    quantity=int(line.get('quantity', 1))))
        db.session.commit()
        return p.to_dict(), 200

    @jwt_required()
    def delete(self, promo_id):
        claims = get_jwt()
        if claims.get('role') not in ('business_admin', 'branch_manager', 'super_admin'):
            return {"message": "Sin permiso"}, 403
        p = Promotion.query.get_or_404(promo_id)
        db.session.delete(p)
        db.session.commit()
        return {"message": "Promoción eliminada"}, 200

class ClientAuthResource(Resource):
    def post(self):
        data = request.get_json() or {}
        username = (data.get('username') or '').strip()
        password = data.get('password') or ''
        if not username or not password:
            return {"message": "Usuario y contraseña requeridos"}, 400
        client = Client.query.filter_by(username=username).first()
        if not client or not client.password:
            return {"message": "Usuario no encontrado"}, 401
        if not check_password_hash(client.password, password):
            return {"message": "Contraseña incorrecta"}, 401
        business_id = None
        if client.branch_id:
            branch = Branch.query.get(client.branch_id)
            business_id = branch.business_id if branch else None
        additional = {
            "role": "client",
            "client_id": client.id,
            "business_id": business_id,
            "branch_id": client.branch_id,
            "is_super_admin": False,
        }
        token = create_access_token(identity=str(client.id), additional_claims=additional)
        return {"access_token": token, "role": "client", "client_id": client.id,
                "business_id": business_id, "full_name": client.full_name}, 200

class ClientPortalMeResource(Resource):
    @jwt_required()
    def get(self):
        claims = get_jwt()
        if claims.get('role') != 'client':
            return {"message": "Acceso denegado"}, 403
        client = Client.query.get_or_404(int(get_jwt_identity()))
        return client.to_dict(), 200

class ClientPortalOrdersResource(Resource):
    @jwt_required()
    def get(self):
        claims = get_jwt()
        if claims.get('role') != 'client':
            return {"message": "Acceso denegado"}, 403
        client_id = int(get_jwt_identity())
        from sqlalchemy import text as sa_text
        orders = Order.query.filter_by(client_id=client_id).order_by(Order.id.desc()).all()
        return {"orders": [o.to_dict() for o in orders]}, 200

class ClientPortalDiscountsResource(Resource):
    @jwt_required()
    def get(self):
        claims = get_jwt()
        if claims.get('role') != 'client':
            return {"message": "Acceso denegado"}, 403
        client_id = int(get_jwt_identity())
        client = Client.query.get_or_404(client_id)
        discounts = ClientDiscount.query.filter_by(client_id=client_id).order_by(ClientDiscount.created_at.desc()).all()
        promos = []
        if client.client_type_id and client.branch_id:
            branch = Branch.query.get(client.branch_id)
            if branch:
                promos = Promotion.query.filter_by(business_id=branch.business_id, active=True).filter(
                    db.or_(Promotion.client_type_id == client.client_type_id, Promotion.client_type_id.is_(None))
                ).order_by(Promotion.created_at.desc()).all()
        return {
            "discounts": [d.to_dict() for d in discounts],
            "promotions": [p.to_dict() for p in promos],
        }, 200

class ClientListResource(Resource):
    @jwt_required()
    def post(self):
        data = request.get_json() or {}
        claims = get_jwt()
        first_name = (data.get('first_name') or '').strip()
        last_name = (data.get('last_name') or '').strip()
        phone = (data.get('phone') or '').strip()
        if not first_name or not phone:
            return {"message": "Nombre y teléfono son requeridos"}, 400
        if Client.query.filter_by(phone=phone).first():
            return {"message": "Ya existe un cliente con ese teléfono"}, 409
        branch_id = claims.get('branch_id')
        if not branch_id:
            branch_id = data.get('branch_id')
        new_client = Client(
            full_name=first_name.title(),
            last_name=last_name.title() if last_name else None,
            phone=phone,
            email=(data.get('email') or '').strip() or None,
            notes=(data.get('notes') or '').strip() or None,
            street_and_number=(data.get('street_number') or '').strip() or None,
            neighborhood=(data.get('neighborhood') or '').strip() or None,
            zip_code=str(data.get('zip_code')) if data.get('zip_code') else None,
            date_of_birth_day=data.get('date_of_birth_day') or None,
            date_of_birth_month=data.get('date_of_birth_month') or None,
            branch_id=branch_id,
            client_type_id=data.get('client_type_id') or None,
            username=(data.get('username') or '').strip() or None,
            password=generate_password_hash(data['password']) if data.get('password') else None,
            whatsapp_consent=bool(data.get('whatsapp_consent', False)),
            email_consent=bool(data.get('email_consent', False)),
        )
        db.session.add(new_client)
        db.session.commit()
        branch = Branch.query.get(new_client.branch_id) if new_client.branch_id else None
        if branch:
            fire_whatsapp_trigger('client_welcome', branch.business_id, new_client)
        return {"message": "Cliente creado", "client": new_client.to_dict()}, 201

    @jwt_required()
    def get(self):
        claims = get_jwt()
        search = request.args.get('search', '').strip()
        query = Client.query
        if not claims.get('is_super_admin'):
            branch_id = claims.get('branch_id') or claims.get('active_branch_id')
            if branch_id:
                query = query.filter(Client.branch_id == branch_id)
            else:
                business_id = claims.get('business_id')
                branch_ids = [b.id for b in Branch.query.filter_by(business_id=business_id).all()]
                query = query.filter(Client.branch_id.in_(branch_ids))
        if search:
            like = f"%{search}%"
            query = query.filter(
                db.or_(
                    Client.full_name.ilike(like),
                    Client.last_name.ilike(like),
                    Client.phone.ilike(like),
                    Client.neighborhood.ilike(like),
                )
            )
        return {"clients": [c.to_dict() for c in query.order_by(Client.full_name).limit(100).all()]}, 200

class ClientResource(Resource):
    @jwt_required()
    def get(self, client_id):
        client = Client.query.get_or_404(client_id)
        return client.to_dict(), 200

    @jwt_required()
    def put(self, client_id):
        client = Client.query.get_or_404(client_id)
        data = request.get_json() or {}
        if data.get('first_name'):
            client.full_name = data['first_name'].strip().title()
        if 'last_name' in data:
            client.last_name = (data['last_name'] or '').strip().title() or None
        if data.get('phone'):
            existing = Client.query.filter(Client.phone == data['phone'], Client.id != client_id).first()
            if existing:
                return {"message": "Ya existe un cliente con ese teléfono"}, 409
            client.phone = data['phone'].strip()
        if 'email' in data:
            client.email = (data['email'] or '').strip() or None
        if 'notes' in data:
            client.notes = (data['notes'] or '').strip() or None
        if 'street_number' in data:
            client.street_and_number = (data['street_number'] or '').strip() or None
        if 'neighborhood' in data:
            client.neighborhood = (data['neighborhood'] or '').strip() or None
        if 'zip_code' in data:
            client.zip_code = str(data['zip_code']) if data['zip_code'] else None
        if 'date_of_birth_day' in data:
            client.date_of_birth_day = data['date_of_birth_day'] or None
        if 'date_of_birth_month' in data:
            client.date_of_birth_month = data['date_of_birth_month'] or None
        if 'client_type_id' in data:
            client.client_type_id = data['client_type_id'] or None
        if 'username' in data:
            new_uname = (data['username'] or '').strip() or None
            if new_uname and new_uname != client.username:
                if Client.query.filter(Client.username == new_uname, Client.id != client_id).first():
                    return {"message": "Ese nombre de usuario ya está en uso"}, 409
            client.username = new_uname
        if data.get('password'):
            client.password = generate_password_hash(data['password'])
        if 'whatsapp_consent' in data:
            client.whatsapp_consent = bool(data['whatsapp_consent'])
        if 'email_consent' in data:
            client.email_consent = bool(data['email_consent'])
        db.session.commit()
        return {"message": "Cliente actualizado", "client": client.to_dict()}, 200

class Color(db.Model):
    __tablename__ = 'colors'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False, unique=True)
    hex_code = db.Column(db.String(7), nullable=True)
    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'hex_code': self.hex_code}

class Print(db.Model):
    __tablename__ = 'prints'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False, unique=True)
    def to_dict(self):
        return {'id': self.id, 'name': self.name}

class Defect(db.Model):
    __tablename__ = 'defects'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False, unique=True)
    def to_dict(self):
        return {'id': self.id, 'name': self.name}


def _make_list_resource(Model, plural):
    class ListRes(Resource):
        @jwt_required()
        def get(self):
            return {plural: [i.to_dict() for i in Model.query.order_by(Model.name).all()]}, 200
        @jwt_required()
        def post(self):
            claims = get_jwt()
            if claims.get('role') not in ('super_admin',):
                return {'message': 'Solo el super admin puede modificar este catálogo'}, 403
            data = request.get_json() or {}
            name = (data.get('name') or '').strip()
            if not name:
                return {'message': 'El nombre es requerido'}, 400
            if Model.query.filter(db.func.lower(Model.name) == name.lower()).first():
                return {'message': f'Ya existe "{name}"'}, 409
            kwargs = {'name': name}
            if hasattr(Model, 'hex_code'):
                kwargs['hex_code'] = (data.get('hex_code') or '').strip() or None
            obj = Model(**kwargs)
            db.session.add(obj)
            db.session.commit()
            return obj.to_dict(), 201
    ListRes.__name__ = f'{Model.__name__}ListResource'
    return ListRes

def _make_detail_resource(Model):
    class DetailRes(Resource):
        @jwt_required()
        def put(self, **kwargs):
            claims = get_jwt()
            if claims.get('role') not in ('super_admin',):
                return {'message': 'Solo el super admin puede modificar este catálogo'}, 403
            obj_id = list(kwargs.values())[0]
            obj = Model.query.get_or_404(obj_id)
            data = request.get_json() or {}
            if data.get('name'):
                obj.name = data['name'].strip()
            if hasattr(obj, 'hex_code') and 'hex_code' in data:
                obj.hex_code = (data['hex_code'] or '').strip() or None
            db.session.commit()
            return obj.to_dict(), 200
        @jwt_required()
        def delete(self, **kwargs):
            claims = get_jwt()
            if claims.get('role') not in ('super_admin',):
                return {'message': 'Solo el super admin puede modificar este catálogo'}, 403
            obj_id = list(kwargs.values())[0]
            obj = Model.query.get_or_404(obj_id)
            db.session.delete(obj)
            db.session.commit()
            return {'message': 'Eliminado'}, 200
    DetailRes.__name__ = f'{Model.__name__}Resource'
    return DetailRes

ColorListResource = _make_list_resource(Color, 'colors')
ColorResource = _make_detail_resource(Color)
PrintListResource = _make_list_resource(Print, 'prints')
PrintResource = _make_detail_resource(Print)
DefectListResource = _make_list_resource(Defect, 'defects')
DefectResource = _make_detail_resource(Defect)


class OrderListResource(Resource):
    @jwt_required()
    def post(self):
        claims = get_jwt()
        data = request.get_json()
        client_id = data.get('client_id')
        notes = data.get('notes', '')
        discount_amount = float(data.get('discount_amount', 0))
        promo_discount = float(data.get('promo_discount', 0))
        total_discount = round(discount_amount + promo_discount, 2)
        items_data = data.get('items', [])
        payments_data = data.get('payments', [])
        urgency = data.get('urgency', 'normal')
        delivery_date_override = data.get('delivery_date')  # ISO string if manually edited

        if not client_id:
            return {"message": "client_id es requerido"}, 400
        if not items_data:
            return {"message": "La orden debe tener al menos un artículo"}, 400

        client = Client.query.get(client_id)
        if not client:
            return {"message": "Cliente no encontrado"}, 404

        branch_id = int(claims.get('branch_id') or data.get('branch_id') or 0)
        if not branch_id:
            return {"message": "No tienes sucursal asignada"}, 400

        user_type = claims.get('user_type')
        if user_type == 'Employee':
            emp_id = int(get_jwt_identity())
        else:
            emp = Employee.query.filter_by(branch_id=branch_id).first()
            emp_id = emp.id if emp else None
        if not emp_id:
            return {"message": "No se encontró empleado para esta sucursal"}, 400

        employee = Employee.query.get(emp_id)
        if user_type == 'Employee' and employee:
            created_by_name = employee.full_name or employee.username
            if getattr(employee, 'last_name', None):
                created_by_name += f" {employee.last_name}"
        else:
            created_by_name = claims.get('full_name') or claims.get('username', '')

        branch = Branch.query.get(branch_id)
        business = Business.query.get(branch.business_id) if branch else None

        # Calcular delivery_date
        if delivery_date_override:
            try:
                delivery_dt = datetime.fromisoformat(delivery_date_override.replace('Z', ''))
            except Exception:
                delivery_dt = None
        else:
            if business:
                days_map = {'normal': business.normal_days, 'urgent': business.urgent_days, 'extra_urgent': business.extra_urgent_days}
                days = days_map.get(urgency, business.normal_days)
            else:
                days = {'normal': 3, 'urgent': 1, 'extra_urgent': 0}.get(urgency, 3)
            delivery_dt = calculate_delivery_date(business.id if business else 0, datetime.utcnow(), days)

        subtotal = sum(float(i['unit_price']) * int(i['quantity']) for i in items_data)
        branch_cfg = branch.get_config() if branch else {}
        discount_enabled = branch_cfg.get('discount_enabled', True)
        if not discount_enabled:
            total_discount = 0.0
        taxable = max(0, subtotal - total_discount)
        uses_iva = branch_cfg.get('uses_iva', business.uses_iva if business else True)
        tax = round(taxable * 0.16, 2) if uses_iva else 0.0
        total = round(taxable + tax, 2)

        # Calcular pago
        total_paid = round(sum(float(p['amount']) for p in payments_data), 2)
        is_deferred = data.get('is_deferred', False)

        if is_deferred:
            payment_status = 'pending'
            amount_paid = 0.0
        elif total_paid >= total:
            payment_status = 'paid'
            amount_paid = total
        elif total_paid > 0:
            payment_status = 'partial'
            amount_paid = total_paid
        else:
            payment_status = 'pending'
            amount_paid = 0.0

        new_order = Order(
            client_id=client_id, branch_id=branch_id, employee_id=emp_id,
            notes=notes, subtotal=round(subtotal, 2), discount=total_discount,
            tax=tax, total_amount=total,
            payment_status=payment_status, amount_paid=amount_paid,
            urgency=urgency, delivery_date=delivery_dt,
            created_by_name=created_by_name,
        )
        db.session.add(new_order)
        db.session.flush()

        for i in items_data:
            line_total = round(float(i['unit_price']) * int(i['quantity']), 2)
            db.session.add(OrderItem(
                order_id=new_order.id,
                product_service_id=i['product_service_id'],
                quantity=int(i['quantity']),
                unit_price=float(i['unit_price']),
                line_total=line_total
            ))

        for p in payments_data:
            points_used = float(p.get('points_used', 0))
            db.session.add(OrderPayment(
                order_id=new_order.id,
                method=p['method'],
                amount=float(p['amount']),
                points_used=points_used,
            ))

        # Acumular puntos si el pago es completo en el momento
        payment_points_enabled = branch_cfg.get('payment_points', business.payment_points if business else False)
        if payment_status == 'paid' and payment_points_enabled:
            points_per_peso = branch_cfg.get('points_per_peso', business.points_per_peso if business else 0)
            points_earned = round(total * points_per_peso, 2)
            client.points_balance = (client.points_balance or 0) + points_earned

        # Descontar puntos usados
        total_points_used = sum(float(p.get('points_used', 0)) for p in payments_data)
        if total_points_used > 0:
            client.points_balance = max(0, (client.points_balance or 0) - total_points_used)

        # Avanzar folio — siempre lo genera el backend
        if branch:
            prefix = branch.folio_prefix or ""
            counter = (branch.folio_counter or 0) + 1
            branch.folio_counter = counter
            new_order.folio = f"{prefix}{str(counter).zfill(4)}" if prefix else str(counter).zfill(4)

        # Generar tickets de prenda (uno por pieza individual, considerando units)
        ticket_seq = 1
        for i in items_data:
            item_obj = Item.query.get(i.get('product_service_id'))
            item_name = item_obj.name if item_obj else 'Prenda'
            units = item_obj.units if item_obj else 1
            total_tickets = int(i.get('quantity', 1)) * (units or 1)
            for _ in range(total_tickets):
                code = f"{new_order.folio}-{ticket_seq}"
                db.session.add(OrderGarmentTicket(
                    order_id=new_order.id,
                    ticket_code=code,
                    item_name=item_name,
                    quantity_index=ticket_seq,
                    scanned=False,
                ))
                ticket_seq += 1

        try:
            db.session.commit()
            return {"message": "Orden creada", "order": new_order.to_dict()}, 201
        except Exception as e:
            db.session.rollback()
            return {"message": str(e)}, 500

    @jwt_required()
    def get(self):
        claims = get_jwt()
        query = Order.query
        if not claims.get("is_super_admin"):
            branch_id = claims.get('branch_id') or claims.get('active_branch_id')
            if branch_id:
                query = query.filter(Order.branch_id == branch_id)
            else:
                query = query.join(Order.branch).filter(Branch.business_id == claims.get('business_id'))
        # Optional filter by client
        client_id_filter = request.args.get('client_id')
        if client_id_filter:
            query = query.filter(Order.client_id == int(client_id_filter))
        orders = query.order_by(Order.order_date.desc()).limit(200).all()
        now = datetime.utcnow()
        changed = False
        for o in orders:
            if o.status == 'Pendiente' and (now - o.order_date).total_seconds() >= 7200:
                o.status = 'En Proceso'
                changed = True
        if changed:
            db.session.commit()
        return {"orders": [o.to_dict() for o in orders]}, 200

class OrderResource(Resource):
    @jwt_required()
    def get(self, order_id):
        claims = get_jwt()
        order = Order.query.get_or_404(order_id)
        if not claims.get('is_super_admin') and order.branch.business_id != claims.get('business_id'):
            return {"message": "Acceso denegado"}, 403
        if order.status == 'Pendiente' and (datetime.utcnow() - order.order_date).total_seconds() >= 7200:
            order.status = 'En Proceso'
            db.session.commit()
        return order.to_dict(), 200

    @jwt_required()
    def put(self, order_id):
        claims = get_jwt()
        order = Order.query.get_or_404(order_id)
        if not claims.get('is_super_admin') and order.branch.business_id != claims.get('business_id'):
            return {"message": "Acceso denegado"}, 403
        data = request.get_json()
        new_status = data.get('status')
        if new_status == 'Cancelado':
            cancel_auth = data.get('cancel_auth_code', '')
            branch = Branch.query.get(order.branch_id)
            business_id = branch.business_id if branch else None
            authorized = False
            if business_id:
                admin = Admin.query.filter_by(business_id=business_id, is_super_admin=False).first()
                if admin and check_password_hash(admin.password, cancel_auth):
                    authorized = True
                if not authorized:
                    gerente = Employee.query.join(Employee.roles).filter(
                        Employee.branch_id == order.branch_id,
                        Role.name == 'Gerente'
                    ).first()
                    if gerente and check_password_hash(gerente.password_hash, cancel_auth):
                        authorized = True
            if not authorized:
                return {"message": "Código de autorización incorrecto"}, 403
            if order.status in ('Entregado', 'Cancelado'):
                return {"message": "No se puede cancelar una orden ya entregada o cancelada"}, 400
            order.status = 'Cancelado'
        elif new_status:
            order.status = new_status
        if 'notes' in data:
            order.notes = data['notes']
        db.session.commit()
        if new_status == 'Listo':
            client = Client.query.get(order.client_id) if order.client_id else None
            branch = Branch.query.get(order.branch_id)
            if client and branch:
                fire_whatsapp_trigger('order_ready', branch.business_id, client, {'folio': order.folio or str(order.id)})
                completed_orders = Order.query.filter_by(client_id=client.id).filter(
                    Order.status.in_(['Listo', 'Entregado'])
                ).count()
                if completed_orders == 3:
                    fire_whatsapp_trigger('client_recurring', branch.business_id, client)
        return {"message": "Orden actualizada", "order": order.to_dict()}, 200

class OrderPaymentResource(Resource):
    @jwt_required()
    def post(self, order_id):
        claims = get_jwt()
        order = Order.query.get_or_404(order_id)
        if not claims.get('is_super_admin') and order.branch.business_id != claims.get('business_id'):
            return {"message": "Acceso denegado"}, 403
        if order.payment_status == 'paid':
            return {"message": "Esta orden ya está pagada"}, 400
        data = request.get_json()
        payments_data = data.get('payments', [])
        if not payments_data:
            return {"message": "Se requiere al menos un pago"}, 400

        branch = Branch.query.get(order.branch_id)
        business = Business.query.get(branch.business_id) if branch else None
        client = Client.query.get(order.client_id)
        total = float(order.total_amount)
        prev_paid = float(order.amount_paid)

        new_paid = round(sum(float(p['amount']) for p in payments_data), 2)
        total_paid = round(prev_paid + new_paid, 2)

        for p in payments_data:
            points_used = float(p.get('points_used', 0))
            db.session.add(OrderPayment(
                order_id=order.id,
                method=p['method'],
                amount=float(p['amount']),
                points_used=points_used,
            ))
            if points_used > 0 and client:
                client.points_balance = max(0, (client.points_balance or 0) - points_used)

        if total_paid >= total:
            order.payment_status = 'paid'
            order.amount_paid = total
            if business and business.payment_points and client:
                points_earned = round(total * business.points_per_peso, 2)
                client.points_balance = (client.points_balance or 0) + points_earned
        else:
            order.payment_status = 'partial'
            order.amount_paid = total_paid

        db.session.commit()
        return {"message": "Pago registrado", "order": order.to_dict()}, 200

class OrderByFolioResource(Resource):
    @jwt_required()
    def get(self, folio):
        claims = get_jwt()
        branch_id = int(claims.get('branch_id') or 0)
        if branch_id:
            order = Order.query.filter_by(folio=folio, branch_id=branch_id).first()
        else:
            order = Order.query.filter_by(folio=folio).first()
        if not order:
            return {"message": "Orden no encontrada"}, 404
        if not claims.get('is_super_admin') and order.branch.business_id != claims.get('business_id'):
            return {"message": "Acceso denegado"}, 403
        if order.status not in ('En Producción', 'Listo', 'Entregado', 'Cancelado'):
            order.status = 'En Producción'
            db.session.commit()
        return order.to_dict(), 200

class OrderScanGarmentResource(Resource):
    @jwt_required()
    def post(self, order_id):
        claims = get_jwt()
        order = Order.query.get_or_404(order_id)
        if not claims.get('is_super_admin') and order.branch.business_id != claims.get('business_id'):
            return {"message": "Acceso denegado"}, 403
        data = request.get_json()
        ticket_code = data.get('ticket_code', '').strip()
        ticket = OrderGarmentTicket.query.filter_by(ticket_code=ticket_code).first()
        if not ticket:
            return {"error": "ticket_no_encontrado", "message": f"No se encontró el ticket '{ticket_code}'"}, 404
        if ticket.order_id != order_id:
            wrong_order = Order.query.get(ticket.order_id)
            return {"error": "prenda_equivocada",
                    "message": f"Esta prenda pertenece a la orden {wrong_order.folio if wrong_order else ticket.order_id}",
                    "belongs_to": wrong_order.folio if wrong_order else str(ticket.order_id)}, 400
        if not ticket.scanned:
            ticket.scanned = True
            ticket.scanned_at = datetime.utcnow()
            db.session.commit()
        tickets = OrderGarmentTicket.query.filter_by(order_id=order_id).all()
        return {"message": "Prenda escaneada", "tickets": [t.to_dict() for t in tickets],
                "all_scanned": all(t.scanned for t in tickets)}, 200

class OrderAssignCarouselResource(Resource):
    @jwt_required()
    def post(self, order_id):
        claims = get_jwt()
        order = Order.query.get_or_404(order_id)
        if not claims.get('is_super_admin') and order.branch.business_id != claims.get('business_id'):
            return {"message": "Acceso denegado"}, 403
        tickets = OrderGarmentTicket.query.filter_by(order_id=order_id).all()
        branch = order.branch
        branch_cfg = branch.get_config() if branch else {}
        require_scan = branch_cfg.get('require_scan', True)
        if require_scan and tickets and not all(t.scanned for t in tickets):
            return {"message": "Debes escanear todas las prendas antes de asignar posición"}, 400
        data = request.get_json()
        carousel_position = data.get('carousel_position', '').strip()
        if not carousel_position:
            return {"message": "carousel_position es requerido"}, 400
        order.carousel_position = carousel_position
        order.status = 'Listo'
        db.session.commit()
        return {"message": "Posición asignada, orden lista", "order": order.to_dict()}, 200

class OrderDeliverResource(Resource):
    @jwt_required()
    def post(self, order_id):
        claims = get_jwt()
        order = Order.query.get_or_404(order_id)
        if not claims.get('is_super_admin') and order.branch.business_id != claims.get('business_id'):
            return {"message": "Acceso denegado"}, 403
        if order.status == 'Entregado':
            return {"message": "Esta orden ya fue entregada"}, 400
        if order.status == 'Cancelado':
            return {"message": "No se puede entregar una orden cancelada"}, 400
        data = request.get_json()
        payments_data = data.get('payments', [])
        total = float(order.total_amount)
        prev_paid = float(order.amount_paid)
        remaining = round(total - prev_paid, 2)
        new_paid = round(sum(float(p['amount']) for p in payments_data), 2)
        if remaining > 0 and new_paid < remaining:
            return {"message": f"Saldo pendiente: ${remaining}. Debe liquidarse completo para entregar"}, 400
        for p in payments_data:
            db.session.add(OrderPayment(
                order_id=order.id,
                method=p['method'],
                amount=float(p['amount']),
                points_used=0,
            ))
        order.payment_status = 'paid'
        order.amount_paid = total
        order.status = 'Entregado'
        order.delivered_at = datetime.utcnow()
        db.session.commit()
        return {"message": "Orden entregada", "order": order.to_dict()}, 200

class OrderStatsResource(Resource):
    @jwt_required()
    def get(self):
        claims = get_jwt()
        business_id = claims.get('business_id')
        branch_id_jwt = claims.get('branch_id')
        branch_id_param = request.args.get('branch_id')
        branch_id = branch_id_jwt
        if not branch_id and branch_id_param:
            valid_branch = Branch.query.filter_by(id=branch_id_param, business_id=business_id).first()
            if not valid_branch:
                return {"message": "Branch no autorizado"}, 403
            branch_id = branch_id_param
        today = datetime.utcnow().date()

        q = Order.query.join(Order.branch).filter(
            Branch.business_id == business_id,
            Order.status.notin_(['Entregado', 'Cancelado'])
        )
        if branch_id:
            q = q.filter(Order.branch_id == branch_id)

        overdue        = q.filter(Order.delivery_date < datetime.combine(today, datetime.min.time())).count()
        today_normal   = q.filter(
            Order.delivery_date >= datetime.combine(today, datetime.min.time()),
            Order.delivery_date < datetime.combine(today + timedelta(days=1), datetime.min.time()),
            Order.urgency == 'normal'
        ).count()
        today_urgent   = q.filter(
            Order.delivery_date >= datetime.combine(today, datetime.min.time()),
            Order.delivery_date < datetime.combine(today + timedelta(days=1), datetime.min.time()),
            Order.urgency == 'urgent'
        ).count()
        today_extra    = q.filter(
            Order.delivery_date >= datetime.combine(today, datetime.min.time()),
            Order.delivery_date < datetime.combine(today + timedelta(days=1), datetime.min.time()),
            Order.urgency == 'extra_urgent'
        ).count()

        cutoff_30 = datetime.combine(today - timedelta(days=30), datetime.min.time())
        cutoff_60 = datetime.combine(today - timedelta(days=60), datetime.min.time())
        cutoff_90 = datetime.combine(today - timedelta(days=90), datetime.min.time())

        past_30 = q.filter(Order.delivery_date <= cutoff_30).count()
        past_60 = q.filter(Order.delivery_date <= cutoff_60).count()
        past_90 = q.filter(Order.delivery_date <= cutoff_90).count()

        return {
            "overdue": overdue,
            "today_normal": today_normal,
            "today_urgent": today_urgent,
            "today_extra": today_extra,
            "past_30": past_30,
            "past_60": past_60,
            "past_90": past_90,
        }, 200

class BranchManagerResource(Resource):
    @jwt_required()
    def post(self):
        claims = get_jwt()
        if claims.get('is_super_admin') or claims.get('role') == 'business_admin':
            pass
        else:
            return {"message": "Permiso denegado"}, 403
        data = request.get_json()
        base_username = data.get('base_username')
        password = data.get('password')
        branch_id = data.get('branch_id')
        if not base_username or not password or not branch_id:
            return {"message": "base_username, password y branch_id son requeridos"}, 400
        branch = Branch.query.get(branch_id)
        if not branch:
            return {"message": "Sucursal no encontrada"}, 404
        if not claims.get('is_super_admin') and branch.business_id != claims.get('business_id'):
            return {"message": "Sucursal no pertenece a tu negocio"}, 403
        username = f"{base_username}@{branch.name}"
        if Admin.query.filter_by(username=username).first():
            return {"message": f"El usuario '{username}' ya existe"}, 409
        new_manager = Admin(
            username=username,
            password=generate_password_hash(password),
            is_super_admin=False,
            business_id=branch.business_id,
            branch_id=branch_id
        )
        try:
            db.session.add(new_manager)
            db.session.commit()
            return {"message": "Branch Manager creado", "manager": {"id": new_manager.id, "username": new_manager.username, "branch_id": new_manager.branch_id}}, 201
        except Exception as e:
            db.session.rollback()
            return {"message": str(e)}, 500

class LoginResource(Resource):
    def post(self):
        args = login_parser.parse_args()
        username = args['username']
        password = args['password']
        admin = Admin.query.filter_by(username=username).first()
        if admin and check_password_hash(admin.password, password):
            if not admin.is_super_admin:
                biz = Business.query.get(admin.business_id) if admin.business_id else None
                if biz and not biz.is_active:
                    return {"message": "Este negocio está bloqueado. Contacta al administrador del sistema."}, 403
                br = Branch.query.get(admin.branch_id) if admin.branch_id else None
                if br and not br.is_active:
                    return {"message": "Esta sucursal está bloqueada. Contacta al administrador."}, 403
            if admin.is_super_admin:
                role = "super_admin"
            elif admin.is_agency_admin:
                role = "agency_admin"
            elif admin.business_id:
                primary = Admin.query.filter_by(business_id=admin.business_id).order_by(Admin.id).first()
                role = "business_admin" if (primary and primary.id == admin.id) else "branch_manager"
            else:
                role = "business_admin"
            token = create_access_token(identity=str(admin.id), additional_claims={
                "is_super_admin": admin.is_super_admin,
                "is_agency_admin": admin.is_agency_admin or False,
                "business_id": admin.business_id,
                "branch_id": admin.branch_id,
                "agency_id": admin.agency_id,
                "user_type": "Admin",
                "role": role,
                "username": admin.username,
                "full_name": admin.username,
            })
            return {"access_token": token, "role": role, "business_id": admin.business_id,
                    "branch_id": admin.branch_id, "user_id": admin.id, "agency_id": admin.agency_id,
                    "username": admin.username, "is_superadmin": admin.is_super_admin}, 200
        employee = Employee.query.filter_by(username=username).first()
        if employee and check_password_hash(employee.password, password):
            role_names = [r.name for r in employee.roles]
            role = "branch_manager" if "Gerente" in role_names else "employee"
            emp_full = employee.full_name or employee.username
            if getattr(employee, 'last_name', None):
                emp_full += f" {employee.last_name}"
            token = create_access_token(identity=str(employee.id), additional_claims={
                "is_super_admin": False,
                "business_id": employee.business_id,
                "branch_id": employee.branch_id,
                "user_type": "Employee",
                "role": role,
                "roles": role_names,
                "username": employee.username,
                "full_name": emp_full,
            })
            return {"access_token": token, "role": role, "business_id": employee.business_id,
                    "branch_id": employee.branch_id, "user_id": employee.id,
                    "username": employee.username, "is_superadmin": False}, 200
        return {"message": "Credenciales invalidas"}, 401

class ProtectedResource(Resource):
    @jwt_required()
    def get(self):
        return {"message": "Access granted", "claims": get_jwt()}, 200

class SelectBranchResource(Resource):
    """Re-issues a JWT with the selected branch_id for business admins."""
    @jwt_required()
    def post(self):
        claims = get_jwt()
        if claims.get("role") not in ("business_admin",) and not claims.get("is_super_admin"):
            return {"message": "Solo disponible para administradores de negocio"}, 403
        data = request.get_json() or {}
        branch_id = data.get("branch_id")
        if not branch_id:
            return {"message": "branch_id requerido"}, 400
        branch = Branch.query.get(branch_id)
        if not branch:
            return {"message": "Sucursal no encontrada"}, 404
        # Verify the branch belongs to this business
        if not claims.get("is_super_admin") and branch.business_id != claims.get("business_id"):
            return {"message": "Sucursal no pertenece a este negocio"}, 403
        identity = get_jwt_identity()
        new_token = create_access_token(identity=identity, additional_claims={
            **claims,
            "branch_id": branch_id,
            "active_branch_id": branch_id,
            "branch_name": branch.name,
        })
        return {"access_token": new_token, "branch_id": branch_id, "branch_name": branch.name}, 200

class BranchItemOverrideResource(Resource):
    @jwt_required()
    def get(self, branch_id, item_id):
        override = BranchItemOverride.query.filter_by(branch_id=branch_id, item_id=item_id).first()
        if override:
            return override.to_dict(), 200
        return {"branch_id": branch_id, "item_id": item_id, "price": None}, 200

    @jwt_required()
    def put(self, branch_id, item_id):
        claims = get_jwt()
        if not claims.get('is_super_admin'):
            jwt_branch = claims.get('branch_id') or claims.get('active_branch_id')
            if int(jwt_branch or 0) != branch_id:
                return {"message": "Permiso denegado"}, 403
        data = request.get_json() or {}
        price = data.get('price')
        if price is None:
            return {"message": "price requerido"}, 400
        override = BranchItemOverride.query.filter_by(branch_id=branch_id, item_id=item_id).first()
        if override:
            override.price = float(price)
        else:
            override = BranchItemOverride(branch_id=branch_id, item_id=item_id, price=float(price))
            db.session.add(override)
        db.session.commit()
        return override.to_dict(), 200

    @jwt_required()
    def delete(self, branch_id, item_id):
        override = BranchItemOverride.query.filter_by(branch_id=branch_id, item_id=item_id).first()
        if override:
            db.session.delete(override)
            db.session.commit()
        return {"message": "Override eliminado"}, 200

# --- REGISTRO DE RECURSOS ---
api.add_resource(AdminRegistration, '/register_admin')
api.add_resource(BusinessCreation, '/register_business')
api.add_resource(LoginResource, '/login', '/api/v1/auth/login')
api.add_resource(BranchManagerResource, '/api/v1/users/branch-managers')
api.add_resource(ProtectedResource, '/protected')
api.add_resource(SelectBranchResource, '/auth/select-branch')
api.add_resource(BranchItemOverrideResource, '/api/v1/branch-item-overrides/branch/<int:branch_id>/item/<int:item_id>')
api.add_resource(RoleListResource, '/roles')
api.add_resource(EmployeeListResource, '/employees')
api.add_resource(EmployeeResource, '/employees/<int:employee_id>')
api.add_resource(EmployeePasswordResource, '/employees/<int:employee_id>/password')
api.add_resource(AdminPasswordResource, '/admins/<int:admin_id>/password')
api.add_resource(ClientPasswordResource, '/api/v1/client-portal/change-password')
api.add_resource(ServiceListResource, '/services')
api.add_resource(ServiceResource, '/services/<int:service_id>')
api.add_resource(CategoryResource, '/services/<int:service_id>/categories')
api.add_resource(CategoryByIdResource, '/categories/<int:category_id>')
api.add_resource(ItemResource, '/categories/<int:category_id>/items')
api.add_resource(ItemDetailResource, '/items/<int:item_id>')
api.add_resource(BusinessResource, '/businesses')
api.add_resource(BusinessByIdResource, '/businesses/<int:business_id>')
api.add_resource(BusinessPublicResource, '/api/v1/businesses/<int:business_id>/public')
api.add_resource(BusinessLogoResource, '/businesses/<int:business_id>/upload-logo')
api.add_resource(BranchResource, '/businesses/<int:business_id>/branches')
api.add_resource(BranchDetailResource, '/branches/<int:branch_id>')
api.add_resource(BusinessToggleResource, '/businesses/<int:business_id>/toggle')
api.add_resource(BranchToggleResource, '/branches/<int:branch_id>/toggle')
api.add_resource(BranchFolioResource, '/branches/<int:branch_id>/folio')
api.add_resource(BranchConfigResource, '/branches/<int:branch_id>/config')
api.add_resource(BranchScanConfigResource, '/branches/<int:branch_id>/scan-config')
api.add_resource(BusinessConfigResource, '/businesses/<int:business_id>/config')
api.add_resource(ClientListResource, '/api/v1/clients')
api.add_resource(ClientResource, '/api/v1/clients/<int:client_id>')
api.add_resource(ClientTypeListResource, '/api/v1/client-types')
api.add_resource(ClientTypeResource, '/api/v1/client-types/<int:type_id>')
api.add_resource(ClientDiscountListResource, '/api/v1/clients/<int:client_id>/discounts')
api.add_resource(ClientDiscountResource, '/api/v1/clients/<int:client_id>/discounts/<int:discount_id>')
api.add_resource(PromotionListResource, '/api/v1/promotions')
api.add_resource(PromotionResource, '/api/v1/promotions/<int:promo_id>')
api.add_resource(ClientAuthResource, '/api/v1/client-auth/login')
api.add_resource(ClientPortalMeResource, '/api/v1/client-portal/me')
api.add_resource(ClientPortalOrdersResource, '/api/v1/client-portal/orders')
api.add_resource(ClientPortalDiscountsResource, '/api/v1/client-portal/discounts')
api.add_resource(OrderListResource, '/api/v1/orders')
api.add_resource(OrderResource, '/api/v1/orders/<int:order_id>')
api.add_resource(OrderPaymentResource, '/api/v1/orders/<int:order_id>/payments')
api.add_resource(OrderByFolioResource, '/api/v1/orders/by-folio/<string:folio>')
api.add_resource(OrderScanGarmentResource, '/api/v1/orders/<int:order_id>/scan-garment')
api.add_resource(OrderAssignCarouselResource, '/api/v1/orders/<int:order_id>/assign-carousel')
api.add_resource(OrderDeliverResource, '/api/v1/orders/<int:order_id>/deliver')
api.add_resource(OrderStatsResource, '/api/v1/orders/stats')
api.add_resource(BusinessHoursResource, '/api/v1/businesses/<int:business_id>/hours')
api.add_resource(BusinessHolidaysResource, '/api/v1/businesses/<int:business_id>/holidays')
api.add_resource(BusinessHolidayResource, '/api/v1/businesses/<int:business_id>/holidays/<int:holiday_id>')

api.add_resource(ColorListResource, '/api/v1/colors')
api.add_resource(ColorResource, '/api/v1/colors/<int:color_id>')
api.add_resource(PrintListResource, '/api/v1/prints')
api.add_resource(PrintResource, '/api/v1/prints/<int:print_id>')
api.add_resource(DefectListResource, '/api/v1/defects')
api.add_resource(DefectResource, '/api/v1/defects/<int:defect_id>')

class CashCutPreviewResource(Resource):
    @jwt_required()
    def get(self):
        try:
            claims = get_jwt()
            business_id = claims.get('business_id')
            branch_id = request.args.get('branch_id') or claims.get('branch_id')
            if not branch_id:
                return {'message': 'branch_id requerido'}, 400
            branch_id = int(branch_id)
            branch = Branch.query.filter_by(id=branch_id, business_id=business_id).first()
            if not branch:
                return {'message': 'Sucursal no autorizada'}, 403

            now = datetime.utcnow()
            last_cut = CashCut.query.filter_by(branch_id=branch_id).order_by(CashCut.cut_at.desc()).first()
            period_from = last_cut.cut_at if last_cut else None
            if period_from is None:
                first_order = Order.query.filter_by(branch_id=branch_id).order_by(Order.order_date.asc()).first()
                period_from = first_order.order_date if first_order else now

            payments = (db.session.query(OrderPayment.method, db.func.sum(OrderPayment.amount))
                .join(Order, Order.id == OrderPayment.order_id)
                .filter(Order.branch_id == branch_id)
                .filter(Order.order_date >= period_from)
                .group_by(OrderPayment.method)
                .all())

            totals = {m: float(a or 0) for m, a in payments}
            orders_count = Order.query.filter(
                Order.branch_id == branch_id,
                Order.order_date >= period_from
            ).count()

            return {
                'period_from': period_from.isoformat() if period_from else None,
                'period_to': now.isoformat(),
                'orders_count': orders_count,
                'expected_cash': totals.get('cash', 0.0),
                'card_total': totals.get('card', 0.0),
                'points_total': totals.get('points', 0.0),
                'last_cut_at': last_cut.cut_at.isoformat() if last_cut else None,
            }, 200
        except Exception as e:
            import traceback
            return {'message': f'Error: {str(e)}', 'trace': traceback.format_exc()}, 500


class CashCutListResource(Resource):
    @jwt_required()
    def get(self):
        try:
            claims = get_jwt()
            business_id = claims.get('business_id')
            branch_id = request.args.get('branch_id') or claims.get('branch_id')
            limit = int(request.args.get('limit', 20))
            offset = int(request.args.get('offset', 0))

            if branch_id:
                try:
                    branch_id = int(branch_id)
                except (ValueError, TypeError):
                    return {'message': 'branch_id inválido'}, 400
                branch = Branch.query.filter_by(id=branch_id, business_id=business_id).first()
                if not branch:
                    return {'message': 'Sucursal no autorizada'}, 403
                q = CashCut.query.filter_by(branch_id=branch_id)
            else:
                q = CashCut.query.filter_by(business_id=business_id)

            total = q.count()
            cuts = q.order_by(CashCut.cut_at.desc()).limit(limit).offset(offset).all()
            return {'items': [c.to_dict() for c in cuts], 'total': total}, 200
        except Exception as e:
            import traceback
            return {'message': f'Error: {str(e)}', 'trace': traceback.format_exc()}, 500

    @jwt_required()
    def post(self):
        claims = get_jwt()
        business_id = claims.get('business_id')
        identity = get_jwt_identity()
        data = request.get_json() or {}
        branch_id = data.get('branch_id') or claims.get('branch_id')

        if not branch_id:
            return {'message': 'branch_id requerido'}, 400
        try:
            branch_id = int(branch_id)
        except (ValueError, TypeError):
            return {'message': 'branch_id inválido'}, 400
        branch = Branch.query.filter_by(id=branch_id, business_id=business_id).first()
        if not branch:
            return {'message': 'Sucursal no autorizada'}, 403

        counted_cash = float(data.get('counted_cash', 0))
        now = datetime.utcnow()

        last_cut = CashCut.query.filter_by(branch_id=branch_id).order_by(CashCut.cut_at.desc()).first()
        period_from = last_cut.cut_at if last_cut else (
            Order.query.filter_by(branch_id=branch_id).order_by(Order.order_date.asc()).first()
        )
        if hasattr(period_from, 'order_date'):
            period_from = period_from.order_date
        if period_from is None:
            period_from = now

        payments = (db.session.query(OrderPayment.method, db.func.sum(OrderPayment.amount))
            .join(Order, Order.id == OrderPayment.order_id)
            .filter(Order.branch_id == branch_id)
            .filter(Order.order_date >= period_from)
            .group_by(OrderPayment.method)
            .all())
        totals = {m: float(a) for m, a in payments}
        expected_cash = totals.get('cash', 0.0)
        orders_count = Order.query.filter(
            Order.branch_id == branch_id,
            Order.order_date >= period_from
        ).count()

        cut = CashCut(
            branch_id=branch_id,
            business_id=business_id,
            cut_by=identity,
            cut_at=now,
            period_from=period_from,
            period_to=now,
            orders_count=orders_count,
            expected_cash=expected_cash,
            counted_cash=counted_cash,
            difference=counted_cash - expected_cash,
            card_total=totals.get('card', 0.0),
            points_total=totals.get('points', 0.0),
            notes=data.get('notes'),
        )
        db.session.add(cut)
        db.session.commit()
        return cut.to_dict(), 201


api.add_resource(CashCutPreviewResource, '/api/v1/cash-cuts/preview')
api.add_resource(CashCutListResource, '/api/v1/cash-cuts')


# ─── Expenses ────────────────────────────────────────────────────────────────

class ExpenseListResource(Resource):
    @jwt_required()
    def get(self):
        try:
            claims = get_jwt()
            business_id = claims.get('business_id')
            branch_id = request.args.get('branch_id')
            category = request.args.get('category')
            date_from = request.args.get('date_from')
            date_to = request.args.get('date_to')
            limit = int(request.args.get('limit', 20))
            offset = int(request.args.get('offset', 0))

            q = Expense.query.filter_by(business_id=business_id)
            if branch_id:
                q = q.filter_by(branch_id=int(branch_id))
            if category:
                q = q.filter_by(category=category)
            if date_from:
                q = q.filter(Expense.expense_date >= date_from)
            if date_to:
                q = q.filter(Expense.expense_date <= date_to)

            total = q.count()
            sum_total = db.session.query(db.func.sum(Expense.total_cost)).filter(
                Expense.business_id == business_id
            )
            if branch_id:
                sum_total = sum_total.filter(Expense.branch_id == int(branch_id))
            if category:
                sum_total = sum_total.filter(Expense.category == category)
            if date_from:
                sum_total = sum_total.filter(Expense.expense_date >= date_from)
            if date_to:
                sum_total = sum_total.filter(Expense.expense_date <= date_to)
            sum_val = float(sum_total.scalar() or 0)

            items = q.order_by(Expense.expense_date.desc(), Expense.created_at.desc()).limit(limit).offset(offset).all()
            return {'items': [e.to_dict() for e in items], 'total': total, 'sum_total_cost': sum_val}, 200
        except Exception as e:
            import traceback
            return {'message': str(e), 'trace': traceback.format_exc()}, 500

    @jwt_required()
    def post(self):
        try:
            claims = get_jwt()
            business_id = claims.get('business_id')
            identity = get_jwt_identity()
            data = request.get_json() or {}
            branch_id = int(data.get('branch_id'))
            branch = Branch.query.filter_by(id=branch_id, business_id=business_id).first()
            if not branch:
                return {'message': 'Sucursal no autorizada'}, 403
            qty = float(data.get('quantity', 1))
            unit_cost = float(data.get('unit_cost', 0))
            exp = Expense(
                business_id=business_id,
                branch_id=branch_id,
                expense_date=data.get('expense_date'),
                category=data.get('category'),
                item_name=data.get('item_name'),
                quantity=qty,
                unit=data.get('unit', 'pzas'),
                unit_cost=unit_cost,
                total_cost=round(qty * unit_cost, 2),
                notes=data.get('notes'),
                created_by=identity,
            )
            db.session.add(exp)
            db.session.commit()
            return exp.to_dict(), 201
        except Exception as e:
            import traceback
            db.session.rollback()
            return {'message': str(e), 'trace': traceback.format_exc()}, 500


class ExpenseResource(Resource):
    @jwt_required()
    def put(self, expense_id):
        try:
            claims = get_jwt()
            business_id = claims.get('business_id')
            exp = Expense.query.filter_by(id=expense_id, business_id=business_id).first()
            if not exp:
                return {'message': 'Gasto no encontrado'}, 404
            data = request.get_json() or {}
            if 'expense_date' in data:
                exp.expense_date = data['expense_date']
            if 'category' in data:
                exp.category = data['category']
            if 'item_name' in data:
                exp.item_name = data['item_name']
            if 'unit' in data:
                exp.unit = data['unit']
            if 'notes' in data:
                exp.notes = data['notes']
            qty = float(data.get('quantity', exp.quantity))
            uc = float(data.get('unit_cost', exp.unit_cost))
            exp.quantity = qty
            exp.unit_cost = uc
            exp.total_cost = round(qty * uc, 2)
            db.session.commit()
            return exp.to_dict(), 200
        except Exception as e:
            db.session.rollback()
            return {'message': str(e)}, 500

    @jwt_required()
    def delete(self, expense_id):
        try:
            claims = get_jwt()
            business_id = claims.get('business_id')
            exp = Expense.query.filter_by(id=expense_id, business_id=business_id).first()
            if not exp:
                return {'message': 'Gasto no encontrado'}, 404
            db.session.delete(exp)
            db.session.commit()
            return {'message': 'Eliminado'}, 200
        except Exception as e:
            db.session.rollback()
            return {'message': str(e)}, 500


# ─── Monthly Goals ────────────────────────────────────────────────────────────

class GoalResource(Resource):
    @jwt_required()
    def get(self):
        try:
            claims = get_jwt()
            business_id = claims.get('business_id')
            year = int(request.args.get('year', datetime.utcnow().year))
            month = int(request.args.get('month', datetime.utcnow().month))
            branch_id = request.args.get('branch_id')

            global_goal = MonthlyGoal.query.filter_by(
                business_id=business_id, branch_id=None, year=year, month=month
            ).first()
            branch_goal = None
            if branch_id:
                branch_goal = MonthlyGoal.query.filter_by(
                    business_id=business_id, branch_id=int(branch_id), year=year, month=month
                ).first()
            return {
                'global': global_goal.to_dict() if global_goal else None,
                'branch': branch_goal.to_dict() if branch_goal else None,
            }, 200
        except Exception as e:
            return {'message': str(e)}, 500

    @jwt_required()
    def post(self):
        try:
            claims = get_jwt()
            business_id = claims.get('business_id')
            data = request.get_json() or {}
            year = int(data.get('year', datetime.utcnow().year))
            month = int(data.get('month', datetime.utcnow().month))
            branch_id = data.get('branch_id')
            if branch_id is not None:
                branch_id = int(branch_id)
            goal_amount = float(data.get('goal_amount', 0))

            existing = MonthlyGoal.query.filter_by(
                business_id=business_id, branch_id=branch_id, year=year, month=month
            ).first()
            if existing:
                existing.goal_amount = goal_amount
            else:
                existing = MonthlyGoal(
                    business_id=business_id, branch_id=branch_id,
                    year=year, month=month, goal_amount=goal_amount
                )
                db.session.add(existing)
            db.session.commit()
            return existing.to_dict(), 200
        except Exception as e:
            db.session.rollback()
            return {'message': str(e)}, 500


# ─── Reports ─────────────────────────────────────────────────────────────────

def _report_filters(claims, args):
    business_id = claims.get('business_id')
    branch_id = args.get('branch_id')
    date_from = args.get('date_from')
    date_to = args.get('date_to')
    if not date_from:
        now = datetime.utcnow()
        date_from = now.replace(day=1).strftime('%Y-%m-%d')
    if not date_to:
        date_to = datetime.utcnow().strftime('%Y-%m-%d')
    dt_from = datetime.strptime(date_from, '%Y-%m-%d')
    dt_to = datetime.strptime(date_to, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
    q = Order.query.join(Branch, Branch.id == Order.branch_id).filter(
        Branch.business_id == business_id,
        Order.order_date >= dt_from,
        Order.order_date <= dt_to,
    )
    if branch_id:
        q = q.filter(Order.branch_id == int(branch_id))
    return business_id, branch_id, dt_from, dt_to, q


class ReportSummaryResource(Resource):
    @jwt_required()
    def get(self):
        try:
            claims = get_jwt()
            business_id, branch_id, dt_from, dt_to, q = _report_filters(claims, request.args)
            orders = q.all()
            total_revenue = sum(float(o.total_amount) for o in orders)
            orders_count = len(orders)
            ticket_avg = round(total_revenue / orders_count, 2) if orders_count else 0
            completed = sum(1 for o in orders if o.status == 'Entregada')
            pending = sum(1 for o in orders if o.status not in ('Entregada',))

            statuses = {}
            for o in orders:
                statuses[o.status] = statuses.get(o.status, 0) + 1

            pay_q = (db.session.query(OrderPayment.method, db.func.sum(OrderPayment.amount))
                .join(Order, Order.id == OrderPayment.order_id)
                .join(Branch, Branch.id == Order.branch_id)
                .filter(Branch.business_id == business_id, Order.order_date >= dt_from, Order.order_date <= dt_to))
            if branch_id:
                pay_q = pay_q.filter(Order.branch_id == int(branch_id))
            payment_breakdown = {m: float(a or 0) for m, a in pay_q.group_by(OrderPayment.method).all()}

            total_collected = sum(float(o.amount_paid) for o in orders)
            total_pending_amt = sum(float(o.total_amount - o.amount_paid) for o in orders)
            return {
                'total_revenue': total_revenue,
                'orders_count': orders_count,
                'ticket_avg': ticket_avg,
                'completed': completed,
                'pending': pending,
                'total_collected': total_collected,
                'total_pending': total_pending_amt,
                'orders_by_status': statuses,
                'payment_breakdown': payment_breakdown,
                'date_from': dt_from.strftime('%Y-%m-%d'),
                'date_to': dt_to.strftime('%Y-%m-%d'),
            }, 200
        except Exception as e:
            import traceback
            return {'message': str(e), 'trace': traceback.format_exc()}, 500


class ReportDailyTrendResource(Resource):
    @jwt_required()
    def get(self):
        try:
            claims = get_jwt()
            business_id, branch_id, dt_from, dt_to, _ = _report_filters(claims, request.args)
            q = (db.session.query(
                    db.func.date(Order.order_date).label('day'),
                    db.func.sum(Order.total_amount).label('revenue'),
                    db.func.count(Order.id).label('orders')
                )
                .join(Branch, Branch.id == Order.branch_id)
                .filter(Branch.business_id == business_id, Order.order_date >= dt_from, Order.order_date <= dt_to))
            if branch_id:
                q = q.filter(Order.branch_id == int(branch_id))
            rows = q.group_by(db.func.date(Order.order_date)).order_by(db.func.date(Order.order_date)).all()
            return [{'date': str(r.day), 'revenue': float(r.revenue or 0), 'orders': r.orders} for r in rows], 200
        except Exception as e:
            return {'message': str(e)}, 500


class ReportTopItemsResource(Resource):
    @jwt_required()
    def get(self):
        try:
            claims = get_jwt()
            business_id, branch_id, dt_from, dt_to, _ = _report_filters(claims, request.args)
            q = (db.session.query(
                    OrderItem.product_service_id,
                    db.func.sum(OrderItem.quantity).label('qty'),
                )
                .join(Order, Order.id == OrderItem.order_id)
                .join(Branch, Branch.id == Order.branch_id)
                .filter(Branch.business_id == business_id, Order.order_date >= dt_from, Order.order_date <= dt_to))
            if branch_id:
                q = q.filter(Order.branch_id == int(branch_id))
            rows = q.group_by(OrderItem.product_service_id).order_by(db.func.sum(OrderItem.quantity).desc()).limit(20).all()
            result = []
            for row in rows:
                item = Item.query.get(row.product_service_id)
                units = item.units if item else 1
                total_qty = int(row.qty or 0)
                total_pieces = total_qty * (units or 1)
                rev_row = db.session.query(db.func.sum(OrderItem.line_total)).filter(
                    OrderItem.product_service_id == row.product_service_id,
                    OrderItem.order_id.in_(
                        db.session.query(Order.id).join(Branch, Branch.id == Order.branch_id)
                        .filter(Branch.business_id == business_id, Order.order_date >= dt_from, Order.order_date <= dt_to)
                    )
                ).scalar() or 0
                result.append({
                    'item_id': row.product_service_id,
                    'item_name': item.name if item else str(row.product_service_id),
                    'total_qty': total_pieces,
                    'total_revenue': float(rev_row),
                })
            return result, 200
        except Exception as e:
            return {'message': str(e)}, 500


class ReportClientRetentionResource(Resource):
    @jwt_required()
    def get(self):
        try:
            claims = get_jwt()
            business_id, branch_id, dt_from, dt_to, q = _report_filters(claims, request.args)
            orders_in_period = q.all()
            client_ids_in_period = {o.client_id for o in orders_in_period}

            new_clients = 0
            recurring_clients = 0
            for cid in client_ids_in_period:
                first_order = Order.query.filter_by(client_id=cid).order_by(Order.order_date.asc()).first()
                if first_order and first_order.order_date >= dt_from:
                    new_clients += 1
                else:
                    recurring_clients += 1

            return {'new': new_clients, 'recurring': recurring_clients, 'total': len(client_ids_in_period)}, 200
        except Exception as e:
            return {'message': str(e)}, 500


class ReportByBranchResource(Resource):
    @jwt_required()
    def get(self):
        try:
            claims = get_jwt()
            business_id = claims.get('business_id')
            date_from = request.args.get('date_from')
            date_to = request.args.get('date_to')
            if not date_from:
                now = datetime.utcnow()
                date_from = now.replace(day=1).strftime('%Y-%m-%d')
            if not date_to:
                date_to = datetime.utcnow().strftime('%Y-%m-%d')
            dt_from = datetime.strptime(date_from, '%Y-%m-%d')
            dt_to = datetime.strptime(date_to, '%Y-%m-%d').replace(hour=23, minute=59, second=59)

            rows = (db.session.query(
                        Order.branch_id,
                        db.func.sum(Order.total_amount).label('revenue'),
                        db.func.count(Order.id).label('orders')
                    )
                    .join(Branch, Branch.id == Order.branch_id)
                    .filter(Branch.business_id == business_id, Order.order_date >= dt_from, Order.order_date <= dt_to)
                    .group_by(Order.branch_id).all())

            result = []
            for r in rows:
                branch = Branch.query.get(r.branch_id)
                delivered = Order.query.filter(
                    Order.branch_id == r.branch_id,
                    Order.status == 'Entregada',
                    Order.order_date >= dt_from, Order.order_date <= dt_to
                ).count()
                rev = float(r.revenue or 0)
                cnt = int(r.orders or 0)
                result.append({
                    'branch_id': r.branch_id,
                    'branch_name': branch.name if branch else str(r.branch_id),
                    'revenue': rev, 'orders': cnt,
                    'avg_ticket': round(rev / cnt, 2) if cnt > 0 else 0,
                    'delivered': delivered,
                })
            return result, 200
        except Exception as e:
            return {'message': str(e)}, 500


class ReportExpensesSummaryResource(Resource):
    @jwt_required()
    def get(self):
        try:
            claims = get_jwt()
            business_id = claims.get('business_id')
            branch_id = request.args.get('branch_id')
            date_from = request.args.get('date_from')
            date_to = request.args.get('date_to')
            if not date_from:
                now = datetime.utcnow()
                date_from = now.replace(day=1).strftime('%Y-%m-%d')
            if not date_to:
                date_to = datetime.utcnow().strftime('%Y-%m-%d')

            q = (db.session.query(Expense.category, db.func.sum(Expense.total_cost).label('total'))
                 .filter(Expense.business_id == business_id,
                         Expense.expense_date >= date_from,
                         Expense.expense_date <= date_to))
            if branch_id:
                q = q.filter(Expense.branch_id == int(branch_id))
            rows = q.group_by(Expense.category).all()
            return {'data': [{'category': r.category, 'total': float(r.total or 0)} for r in rows]}, 200
        except Exception as e:
            return {'message': str(e)}, 500


class ReportAlertsResource(Resource):
    @jwt_required()
    def get(self):
        try:
            claims = get_jwt()
            business_id = claims.get('business_id')
            branch_id = request.args.get('branch_id')
            now = datetime.utcnow()
            alerts = []

            cutoff_48h = now - timedelta(hours=48)
            delay_q = Order.query.join(Branch, Branch.id == Order.branch_id).filter(
                Branch.business_id == business_id,
                Order.status.notin_(['Entregada']),
                Order.order_date <= cutoff_48h,
            )
            if branch_id:
                delay_q = delay_q.filter(Order.branch_id == int(branch_id))
            delayed_count = delay_q.count()
            if delayed_count > 0:
                alerts.append({'level': 'warning', 'message': f'{delayed_count} orden(es) con más de 48h sin entrega'})

            week_start = now - timedelta(days=7)
            four_weeks_ago = now - timedelta(days=28)
            exp_q = db.session.query(Expense.category, db.func.sum(Expense.total_cost).label('total'))
            if branch_id:
                exp_q = exp_q.filter(Expense.branch_id == int(branch_id))
            this_week = {r.category: float(r.total or 0) for r in
                         exp_q.filter(Expense.business_id == business_id,
                                      Expense.expense_date >= week_start.date()).group_by(Expense.category).all()}
            prev_weeks = {r.category: float(r.total or 0) for r in
                          exp_q.filter(Expense.business_id == business_id,
                                       Expense.expense_date >= four_weeks_ago.date(),
                                       Expense.expense_date < week_start.date()).group_by(Expense.category).all()}
            for cat, total in this_week.items():
                prev = prev_weeks.get(cat, 0)
                avg_prev = prev / 3 if prev > 0 else 0
                if avg_prev > 0 and total > avg_prev * 1.2:
                    pct = round((total / avg_prev - 1) * 100)
                    alerts.append({'level': 'error', 'message': f'Gasto en {cat} +{pct}% vs promedio de las últimas 3 semanas'})

            if not alerts:
                alerts.append({'level': 'success', 'message': 'Sin alertas — operación al día'})

            return {'alerts': alerts}, 200
        except Exception as e:
            return {'message': str(e)}, 500


class ReportDailyExpensesResource(Resource):
    @jwt_required()
    def get(self):
        try:
            claims = get_jwt()
            business_id = claims.get('business_id')
            branch_id = request.args.get('branch_id')
            date_from = request.args.get('date_from')
            date_to = request.args.get('date_to')
            if not date_from:
                now = datetime.utcnow()
                date_from = now.replace(day=1).strftime('%Y-%m-%d')
            if not date_to:
                date_to = datetime.utcnow().strftime('%Y-%m-%d')
            q = (db.session.query(
                    Expense.expense_date.label('day'),
                    db.func.sum(Expense.total_cost).label('total'),
                )
                .filter(
                    Expense.business_id == business_id,
                    Expense.expense_date >= date_from,
                    Expense.expense_date <= date_to,
                ))
            if branch_id:
                q = q.filter(Expense.branch_id == int(branch_id))
            q_chem = (db.session.query(
                    Expense.expense_date.label('day'),
                    db.func.sum(Expense.total_cost).label('total'),
                )
                .filter(
                    Expense.business_id == business_id,
                    Expense.expense_date >= date_from,
                    Expense.expense_date <= date_to,
                    Expense.category.in_(['quimicos', 'utilities']),
                ))
            if branch_id:
                q_chem = q_chem.filter(Expense.branch_id == int(branch_id))
            chem_map = {str(r.day): float(r.total or 0) for r in q_chem.group_by(Expense.expense_date).all()}
            rows = q.group_by(Expense.expense_date).order_by(Expense.expense_date).all()
            return {'data': [{'day': str(r.day), 'total': float(r.total or 0), 'quimicos_utilities': chem_map.get(str(r.day), 0)} for r in rows]}, 200
        except Exception as e:
            return {'message': str(e)}, 500


class ReportOverviewResource(Resource):
    @jwt_required()
    def get(self):
        try:
            claims = get_jwt()
            business_id = claims.get('business_id')
            branch_id = request.args.get('branch_id')
            now = datetime.utcnow()
            today = now.date()
            month_start = today.replace(day=1)
            cutoff_48h = now - timedelta(hours=48)

            def _b(q):
                if branch_id:
                    q = q.filter(Order.branch_id == int(branch_id))
                return q

            today_rev = float(_b(
                db.session.query(db.func.sum(Order.total_amount))
                .join(Branch, Branch.id == Order.branch_id)
                .filter(Branch.business_id == business_id, db.func.date(Order.order_date) == today)
            ).scalar() or 0)

            row = _b(
                db.session.query(db.func.sum(Order.total_amount), db.func.count(Order.id))
                .join(Branch, Branch.id == Order.branch_id)
                .filter(Branch.business_id == business_id, Order.order_date >= month_start)
            ).one()
            month_rev, month_count = float(row[0] or 0), int(row[1] or 0)

            active_count = _b(Order.query.join(Branch, Branch.id == Order.branch_id)
                .filter(Branch.business_id == business_id, Order.status.notin_(['Entregado', 'Cancelado']))).count()
            overdue_count = _b(Order.query.join(Branch, Branch.id == Order.branch_id)
                .filter(Branch.business_id == business_id, Order.status.notin_(['Entregado', 'Cancelado']),
                        Order.order_date <= cutoff_48h)).count()

            receivable = float(_b(
                db.session.query(db.func.sum(Order.total_amount - Order.amount_paid))
                .join(Branch, Branch.id == Order.branch_id)
                .filter(Branch.business_id == business_id, Order.payment_status != 'paid')
            ).scalar() or 0)

            top_row = _b(
                db.session.query(OrderItem.product_service_id, db.func.sum(OrderItem.quantity).label('qty'))
                .join(Order, Order.id == OrderItem.order_id)
                .join(Branch, Branch.id == Order.branch_id)
                .filter(Branch.business_id == business_id, Order.order_date >= month_start)
            ).group_by(OrderItem.product_service_id).order_by(db.func.sum(OrderItem.quantity).desc()).first()
            top_service = None
            if top_row:
                itm = Item.query.get(top_row.product_service_id)
                top_service = itm.name if itm else None

            funnel_statuses = ['Creada', 'En proceso', 'En Producción', 'Listo para posicionar', 'Listo', 'Entregado']
            funnel = []
            base_q = Order.query.join(Branch, Branch.id == Order.branch_id).filter(Branch.business_id == business_id)
            for st in funnel_statuses:
                cnt = _b(base_q.filter(Order.status == st)).count()
                if cnt > 0:
                    funnel.append({'name': st, 'value': cnt})

            delivered = _b(base_q.filter(Order.status == 'Entregado')).count()
            in_process = _b(base_q.filter(Order.status.in_(['En proceso', 'En Producción', 'Listo para posicionar']))).count()
            ready = _b(base_q.filter(Order.status == 'Listo')).count()
            total_orders_count = _b(base_q).count()

            avg_cycle = _b(
                db.session.query(db.func.avg(
                    db.func.extract('epoch', Order.delivered_at - Order.order_date) / 3600
                )).join(Branch, Branch.id == Order.branch_id)
                .filter(Branch.business_id == business_id, Order.delivered_at != None)
            ).scalar()

            svc_rows = _b(
                db.session.query(Item.name, db.func.count(OrderItem.id).label('orders'))
                .join(OrderItem, OrderItem.product_service_id == Item.id)
                .join(Order, Order.id == OrderItem.order_id)
                .join(Branch, Branch.id == Order.branch_id)
                .filter(Branch.business_id == business_id, Order.order_date >= month_start)
            ).group_by(Item.name).order_by(db.func.count(OrderItem.id).desc()).limit(8).all()

            return {
                'today_revenue': today_rev, 'month_revenue': month_rev,
                'month_count': month_count,
                'ticket_avg': month_rev / month_count if month_count > 0 else 0,
                'active_count': active_count, 'overdue_count': overdue_count,
                'receivable': receivable, 'top_service': top_service,
                'total_orders': total_orders_count,
                'in_process': in_process,
                'ready': ready,
                'delivered': delivered,
                'overdue': overdue_count,
                'avg_cycle_hours': round(float(avg_cycle), 1) if avg_cycle else None,
                'funnel': funnel,
                'by_service': [{'service': r.name, 'orders': r.orders} for r in svc_rows],
            }, 200
        except Exception as e:
            return {'message': str(e)}, 500


class ReportReceivableResource(Resource):
    @jwt_required()
    def get(self):
        try:
            claims = get_jwt()
            business_id = claims.get('business_id')
            branch_id = request.args.get('branch_id')
            now = datetime.utcnow()
            q = Order.query.join(Branch, Branch.id == Order.branch_id).filter(
                Branch.business_id == business_id,
                Order.payment_status != 'paid',
                Order.total_amount > Order.amount_paid,
            )
            if branch_id:
                q = q.filter(Order.branch_id == int(branch_id))
            orders = q.order_by(Order.order_date.asc()).limit(200).all()
            result = []
            total = 0
            for o in orders:
                balance = float(o.total_amount - o.amount_paid)
                days_old = (now - o.order_date).days
                client = Client.query.get(o.client_id)
                branch = Branch.query.get(o.branch_id)
                result.append({
                    'folio': o.folio or str(o.id),
                    'client_name': f"{client.full_name} {client.last_name or ''}".strip() if client else '—',
                    'client_phone': client.phone if client else '',
                    'branch_name': branch.name if branch else '',
                    'order_date': o.order_date.strftime('%Y-%m-%d'),
                    'total_amount': float(o.total_amount),
                    'amount_paid': float(o.amount_paid),
                    'balance': balance, 'days_old': days_old, 'status': o.status,
                })
                total += balance
            aging = {
                'Hoy': sum(r['balance'] for r in result if r['days_old'] == 0),
                '1-7 días': sum(r['balance'] for r in result if 1 <= r['days_old'] <= 7),
                '8-30 días': sum(r['balance'] for r in result if 8 <= r['days_old'] <= 30),
                '+30 días': sum(r['balance'] for r in result if r['days_old'] > 30),
            }
            partial_orders = sum(1 for r in result if r['amount_paid'] > 0)
            total_all = db.session.query(db.func.count(Order.id)).join(Branch, Branch.id == Order.branch_id).filter(Branch.business_id == business_id).scalar() or 1
            total_paid = db.session.query(db.func.count(Order.id)).join(Branch, Branch.id == Order.branch_id).filter(Branch.business_id == business_id, Order.payment_status == 'paid').scalar() or 0
            pct = round(total_paid / total_all * 100, 1)
            return {
                'total_pending': total, 'pending_orders': len(result),
                'partial_orders': partial_orders, 'pct_paid_on_receive': pct,
                'aging': aging, 'pending_list': result,
            }, 200
        except Exception as e:
            return {'message': str(e)}, 500


class ReportClientsDetailResource(Resource):
    @jwt_required()
    def get(self):
        try:
            claims = get_jwt()
            business_id = claims.get('business_id')
            branch_id = request.args.get('branch_id')
            date_from = request.args.get('date_from')
            date_to = request.args.get('date_to')
            now = datetime.utcnow()
            if not date_from:
                date_from = now.replace(day=1).strftime('%Y-%m-%d')
            if not date_to:
                date_to = now.strftime('%Y-%m-%d')

            q = (db.session.query(Order.client_id,
                    db.func.sum(Order.total_amount).label('total_spend'),
                    db.func.count(Order.id).label('order_count'))
                .join(Branch, Branch.id == Order.branch_id)
                .filter(Branch.business_id == business_id,
                        Order.order_date >= date_from, Order.order_date <= date_to))
            if branch_id:
                q = q.filter(Order.branch_id == int(branch_id))
            rows = q.group_by(Order.client_id).order_by(db.func.sum(Order.total_amount).desc()).limit(10).all()
            top_clients_out = []
            all_client_ids = set()
            for r in rows:
                c = Client.query.get(r.client_id)
                if c:
                    all_client_ids.add(r.client_id)
                    top_clients_out.append({
                        'client_id': r.client_id,
                        'client_name': f"{c.full_name} {c.last_name or ''}".strip(),
                        'phone': c.phone,
                        'orders': int(r.order_count or 0),
                        'total': float(r.total_spend or 0),
                        'points': float(c.points_balance or 0),
                    })

            total_in_period = (db.session.query(db.func.count(db.distinct(Order.client_id)))
                .join(Branch, Branch.id == Order.branch_id)
                .filter(Branch.business_id == business_id,
                        Order.order_date >= date_from, Order.order_date <= date_to)).scalar() or 0

            new_q = (db.session.query(db.func.count(db.distinct(Order.client_id)))
                .join(Branch, Branch.id == Order.branch_id)
                .filter(Branch.business_id == business_id,
                        Order.order_date >= date_from, Order.order_date <= date_to))
            if branch_id:
                new_q = new_q.filter(Order.branch_id == int(branch_id))
            all_ids_period = [r[0] for r in
                db.session.query(db.distinct(Order.client_id))
                .join(Branch, Branch.id == Order.branch_id)
                .filter(Branch.business_id == business_id,
                        Order.order_date >= date_from, Order.order_date <= date_to).all()]
            new_clients_count = 0
            for cid in all_ids_period:
                first = (Order.query.join(Branch, Branch.id == Order.branch_id)
                    .filter(Branch.business_id == business_id, Order.client_id == cid)
                    .order_by(Order.order_date.asc()).first())
                if first and first.order_date.strftime('%Y-%m-%d') >= date_from:
                    new_clients_count += 1
            returning = len(all_ids_period) - new_clients_count

            avg_ticket_val = (db.session.query(db.func.avg(Order.total_amount))
                .join(Branch, Branch.id == Order.branch_id)
                .filter(Branch.business_id == business_id,
                        Order.order_date >= date_from, Order.order_date <= date_to)).scalar() or 0

            sixty_ago = (now - timedelta(days=60)).strftime('%Y-%m-%d')
            inactive_rows = (db.session.query(Order.client_id,
                    db.func.max(Order.order_date).label('last_order'),
                    db.func.count(Order.id).label('total_orders'))
                .join(Branch, Branch.id == Order.branch_id)
                .filter(Branch.business_id == business_id)
                .group_by(Order.client_id)
                .having(db.func.max(Order.order_date) < sixty_ago)
                .order_by(db.func.max(Order.order_date).asc())
                .limit(30).all())
            inactive_clients = []
            for r in inactive_rows:
                c = Client.query.get(r.client_id)
                if c:
                    inactive_clients.append({
                        'client_id': r.client_id,
                        'client_name': f"{c.full_name} {c.last_name or ''}".strip(),
                        'phone': c.phone,
                        'last_order': r.last_order.strftime('%Y-%m-%d') if r.last_order else None,
                        'total_orders': int(r.total_orders or 0),
                    })

            from datetime import date as ddate
            today_d = now.date()
            birthdays = []
            bday_clients = (db.session.query(Client)
                .join(Order, Order.client_id == Client.id)
                .join(Branch, Branch.id == Order.branch_id)
                .filter(Branch.business_id == business_id,
                        Client.date_of_birth_day != None,
                        Client.date_of_birth_month != None)
                .distinct()).all()
            for c in bday_clients:
                try:
                    bday = ddate(today_d.year, c.date_of_birth_month, c.date_of_birth_day)
                except ValueError:
                    continue
                days_until = (bday - today_d).days
                if days_until < 0:
                    try:
                        bday = ddate(today_d.year + 1, c.date_of_birth_month, c.date_of_birth_day)
                        days_until = (bday - today_d).days
                    except ValueError:
                        continue
                if 0 <= days_until <= 30:
                    birthdays.append({'name': f"{c.full_name} {c.last_name or ''}".strip(),
                                      'phone': c.phone, 'days_until': days_until,
                                      'date': bday.strftime('%d/%m')})
            birthdays.sort(key=lambda x: x['days_until'])
            return {
                'new_clients': new_clients_count,
                'returning_clients': returning,
                'avg_ticket': float(avg_ticket_val),
                'top_clients': top_clients_out,
                'inactive_clients': inactive_clients,
                'upcoming_birthdays': birthdays[:10],
            }, 200
        except Exception as e:
            return {'message': str(e)}, 500


class ReportDiscountsResource(Resource):
    @jwt_required()
    def get(self):
        try:
            claims = get_jwt()
            business_id = claims.get('business_id')
            branch_id = request.args.get('branch_id')
            date_from = request.args.get('date_from')
            date_to = request.args.get('date_to')
            now = datetime.utcnow()
            if not date_from:
                date_from = now.replace(day=1).strftime('%Y-%m-%d')
            if not date_to:
                date_to = now.strftime('%Y-%m-%d')
            q = Order.query.join(Branch, Branch.id == Order.branch_id).filter(
                Branch.business_id == business_id,
                Order.order_date >= date_from, Order.order_date <= date_to)
            if branch_id:
                q = q.filter(Order.branch_id == int(branch_id))
            orders = q.all()
            total_subtotal = sum(float(o.subtotal) for o in orders)
            total_discount = sum(float(o.discount) for o in orders)
            total_revenue = sum(float(o.total_amount) for o in orders)
            orders_with_discount = sum(1 for o in orders if float(o.discount) > 0)
            pts_q = (db.session.query(db.func.sum(OrderPayment.points_used))
                .join(Order, Order.id == OrderPayment.order_id)
                .join(Branch, Branch.id == Order.branch_id)
                .filter(Branch.business_id == business_id,
                        Order.order_date >= date_from, Order.order_date <= date_to,
                        OrderPayment.points_used > 0))
            if branch_id:
                pts_q = pts_q.filter(Order.branch_id == int(branch_id))
            total_points = float(pts_q.scalar() or 0)
            promos = Promotion.query.filter_by(business_id=business_id, active=True).all()
            by_promo = []
            for p in promos:
                p_orders = [o for o in orders if float(o.discount or 0) > 0]
                by_promo.append({
                    'promo_id': p.id, 'promo_title': p.title,
                    'times_used': len(p_orders),
                    'total_discount': sum(float(o.discount or 0) for o in p_orders),
                    'revenue': sum(float(o.total_amount or 0) for o in p_orders),
                })
            return {
                'gross_revenue': total_subtotal,
                'total_discounted': total_discount,
                'total_revenue': total_revenue,
                'orders_count': len(orders),
                'orders_with_discount': orders_with_discount,
                'discount_pct': (total_discount / total_subtotal * 100) if total_subtotal > 0 else 0,
                'points_redeemed': total_points,
                'points_value': total_points,
                'by_promotion': by_promo,
            }, 200
        except Exception as e:
            return {'message': str(e)}, 500


api.add_resource(ExpenseListResource, '/api/v1/expenses')
api.add_resource(ExpenseResource, '/api/v1/expenses/<int:expense_id>')
api.add_resource(GoalResource, '/api/v1/goals')
api.add_resource(ReportSummaryResource, '/api/v1/reports/summary')
api.add_resource(ReportDailyTrendResource, '/api/v1/reports/daily-trend')
api.add_resource(ReportTopItemsResource, '/api/v1/reports/top-items')
api.add_resource(ReportClientRetentionResource, '/api/v1/reports/client-retention')
api.add_resource(ReportByBranchResource, '/api/v1/reports/by-branch')
api.add_resource(ReportExpensesSummaryResource, '/api/v1/reports/expenses-summary')
api.add_resource(ReportAlertsResource, '/api/v1/reports/alerts')
api.add_resource(ReportDailyExpensesResource, '/api/v1/reports/daily-expenses')
api.add_resource(ReportOverviewResource, '/api/v1/reports/overview')
api.add_resource(ReportReceivableResource, '/api/v1/reports/receivable')
api.add_resource(ReportClientsDetailResource, '/api/v1/reports/clients-detail')
api.add_resource(ReportDiscountsResource, '/api/v1/reports/discounts')

def auto_advance_orders():
    with app.app_context():
        try:
            cutoff = datetime.utcnow() - timedelta(hours=2)
            orders = Order.query.filter(
                Order.status == 'Creada',
                Order.order_date <= cutoff
            ).all()
            if orders:
                for order in orders:
                    order.status = 'En proceso'
                db.session.commit()
        except Exception as e:
            db.session.rollback()


_scheduler = BackgroundScheduler(timezone="UTC")
_scheduler.add_job(auto_advance_orders, 'interval', minutes=5)
try:
    _scheduler.start()
    atexit.register(lambda: _scheduler.shutdown(wait=False) if _scheduler.running else None)
except Exception:
    pass


def send_whatsapp(to_phone, message_body):
    account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
    auth_token  = os.environ.get('TWILIO_AUTH_TOKEN')
    from_number = os.environ.get('TWILIO_WHATSAPP_NUMBER', 'whatsapp:+14155238886')
    if not account_sid or not auth_token or not _TWILIO_AVAILABLE:
        app.logger.info(f"[WhatsApp MOCK] To: {to_phone} | Msg: {message_body[:80]}")
        return False
    try:
        phone = to_phone.strip().replace(' ', '').replace('-', '')
        if not phone.startswith('+'):
            phone = '+52' + phone
        client = TwilioClient(account_sid, auth_token)
        client.messages.create(
            from_=from_number,
            to=f'whatsapp:{phone}',
            body=message_body
        )
        return True
    except Exception as e:
        app.logger.error(f"[WhatsApp ERROR] {e}")
        return False


def fire_whatsapp_trigger(trigger_type, business_id, client, extra=None):
    try:
        if not client or not client.whatsapp_consent:
            return
        template = WhatsappTemplate.query.filter_by(
            business_id=business_id,
            trigger_type=trigger_type,
            is_active=True
        ).first()
        if not template:
            return
        nombre = f"{client.full_name or ''} {client.last_name or ''}".strip()
        folio  = (extra or {}).get('folio', '')
        msg = template.message_body \
            .replace('{nombre}', nombre) \
            .replace('{folio}', folio)
        send_whatsapp(client.phone, msg)
    except Exception as e:
        app.logger.error(f"[WhatsApp TRIGGER ERROR] {trigger_type}: {e}")


class WhatsappTemplateListResource(Resource):
    @jwt_required()
    def get(self):
        claims = get_jwt()
        business_id = claims.get('business_id')
        if not business_id:
            return {"message": "Acceso denegado"}, 403
        templates = WhatsappTemplate.query.filter_by(business_id=business_id).all()
        return [t.to_dict() for t in templates], 200

    @jwt_required()
    def post(self):
        claims = get_jwt()
        business_id = claims.get('business_id')
        if not business_id:
            return {"message": "Acceso denegado"}, 403
        data = request.get_json() or {}
        trigger_type = data.get('trigger_type', '').strip()
        message_body = data.get('message_body', '').strip()
        VALID_TRIGGERS = ('client_welcome', 'client_recurring', 'order_ready')
        if trigger_type not in VALID_TRIGGERS:
            return {"message": f"trigger_type debe ser uno de: {', '.join(VALID_TRIGGERS)}"}, 400
        if not message_body:
            return {"message": "message_body requerido"}, 400
        existing = WhatsappTemplate.query.filter_by(business_id=business_id, trigger_type=trigger_type).first()
        if existing:
            existing.message_body = message_body
            existing.is_active    = bool(data.get('is_active', True))
            existing.updated_at   = datetime.utcnow()
            db.session.commit()
            return existing.to_dict(), 200
        t = WhatsappTemplate(
            business_id=business_id,
            trigger_type=trigger_type,
            message_body=message_body,
            is_active=bool(data.get('is_active', True)),
        )
        db.session.add(t)
        db.session.commit()
        return t.to_dict(), 201


class WhatsappTemplateResource(Resource):
    @jwt_required()
    def put(self, template_id):
        claims = get_jwt()
        business_id = claims.get('business_id')
        t = WhatsappTemplate.query.get_or_404(template_id)
        if t.business_id != business_id:
            return {"message": "Acceso denegado"}, 403
        data = request.get_json() or {}
        if 'message_body' in data:
            t.message_body = data['message_body']
        if 'is_active' in data:
            t.is_active = bool(data['is_active'])
        t.updated_at = datetime.utcnow()
        db.session.commit()
        return t.to_dict(), 200

    @jwt_required()
    def delete(self, template_id):
        claims = get_jwt()
        business_id = claims.get('business_id')
        t = WhatsappTemplate.query.get_or_404(template_id)
        if t.business_id != business_id:
            return {"message": "Acceso denegado"}, 403
        db.session.delete(t)
        db.session.commit()
        return {"message": "Eliminado"}, 200


api.add_resource(WhatsappTemplateListResource, '/api/v1/whatsapp-templates')
api.add_resource(WhatsappTemplateResource, '/api/v1/whatsapp-templates/<int:template_id>')


class AgencyListResource(Resource):
    @jwt_required()
    def get(self):
        claims = get_jwt()
        if not claims.get('is_super_admin'):
            return {"message": "Solo super admin"}, 403
        agencies = Agency.query.order_by(Agency.name).all()
        return [a.to_dict() for a in agencies], 200

    @jwt_required()
    def post(self):
        claims = get_jwt()
        if not claims.get('is_super_admin'):
            return {"message": "Solo super admin"}, 403
        data = request.get_json() or {}
        if not data.get('name'):
            return {"message": "name requerido"}, 400
        a = Agency(
            name=data['name'].strip(),
            contact_name=data.get('contact_name', '').strip() or None,
            email=data.get('email', '').strip() or None,
            phone=data.get('phone', '').strip() or None,
            notes=data.get('notes', '').strip() or None,
        )
        db.session.add(a)
        db.session.commit()
        return a.to_dict(), 201


class AgencyResource(Resource):
    @jwt_required()
    def get(self, agency_id):
        claims = get_jwt()
        if not claims.get('is_super_admin') and claims.get('agency_id') != agency_id:
            return {"message": "Acceso denegado"}, 403
        a = Agency.query.get_or_404(agency_id)
        d = a.to_dict()
        d['businesses'] = [b.to_dict() for b in a.businesses]
        d['admins'] = [{'id': adm.id, 'username': adm.username} for adm in a.admin_users]
        return d, 200

    @jwt_required()
    def put(self, agency_id):
        claims = get_jwt()
        if not claims.get('is_super_admin'):
            return {"message": "Solo super admin"}, 403
        a = Agency.query.get_or_404(agency_id)
        data = request.get_json() or {}
        for f in ('name', 'contact_name', 'email', 'phone', 'notes'):
            if f in data:
                setattr(a, f, data[f])
        if 'is_active' in data:
            a.is_active = bool(data['is_active'])
        db.session.commit()
        return a.to_dict(), 200

    @jwt_required()
    def delete(self, agency_id):
        claims = get_jwt()
        if not claims.get('is_super_admin'):
            return {"message": "Solo super admin"}, 403
        a = Agency.query.get_or_404(agency_id)
        db.session.delete(a)
        db.session.commit()
        return {"message": "Agencia eliminada"}, 200


class AgencyAssignBusinessResource(Resource):
    @jwt_required()
    def post(self, agency_id):
        claims = get_jwt()
        if not claims.get('is_super_admin'):
            return {"message": "Solo super admin"}, 403
        data = request.get_json() or {}
        business_id = data.get('business_id')
        b = Business.query.get_or_404(business_id)
        b.agency_id = agency_id
        db.session.commit()
        return {"message": "Negocio asignado a la agencia"}, 200


class AgencyAdminCreateResource(Resource):
    @jwt_required()
    def post(self, agency_id):
        claims = get_jwt()
        if not claims.get('is_super_admin'):
            return {"message": "Solo super admin"}, 403
        data = request.get_json() or {}
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        if not username or not password:
            return {"message": "username y password requeridos"}, 400
        if Admin.query.filter_by(username=username).first():
            return {"message": "Username ya existe"}, 400
        a = Admin(
            username=username,
            password=generate_password_hash(password),
            is_super_admin=False,
            is_agency_admin=True,
            agency_id=agency_id,
        )
        db.session.add(a)
        db.session.commit()
        return {"message": "Agency admin creado", "id": a.id, "username": a.username}, 201


class AgencyBusinessesResource(Resource):
    @jwt_required()
    def get(self, agency_id):
        claims = get_jwt()
        if not claims.get('is_super_admin') and claims.get('agency_id') != agency_id:
            return {"message": "Acceso denegado"}, 403
        businesses = Business.query.filter_by(agency_id=agency_id, is_active=True).all()
        return [b.to_dict(include_branches=True) for b in businesses], 200


api.add_resource(AgencyListResource, '/api/v1/agencies')
api.add_resource(AgencyResource, '/api/v1/agencies/<int:agency_id>')
api.add_resource(AgencyAssignBusinessResource, '/api/v1/agencies/<int:agency_id>/assign-business')
api.add_resource(AgencyAdminCreateResource, '/api/v1/agencies/<int:agency_id>/create-admin')
api.add_resource(AgencyBusinessesResource, '/api/v1/agencies/<int:agency_id>/businesses')


if __name__ == '__main__':
    with app.app_context():
        pass
    app.run(debug=True)
