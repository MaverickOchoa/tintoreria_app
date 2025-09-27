from flask import Flask, request, jsonify
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_restful import Api, Resource, reqparse
from flask_migrate import Migrate
from flask_login import UserMixin
from flask_cors import CORS
from sqlalchemy import UniqueConstraint

# Creación de la app
app = Flask(__name__)

# Configuración de la app
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:YoYo158087@localhost/tintoreria_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'una-clave-super-secreta-y-larga'

# Inicialización de las extensiones
db = SQLAlchemy(app)
migrate = Migrate(app, db)
api = Api(app)
jwt = JWTManager(app)
CORS(app)


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
            if claims.get("is_super_admin", True):
                return {"message": "Solo un Administrador de Negocio puede acceder a este recurso"}, 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper


# --- MODELOS DE LA BASE DE DATOS ---
class Admin(db.Model, UserMixin):
    __tablename__ = 'admins'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    is_super_admin = db.Column(db.Boolean, default=False)
    
    business_id = db.Column(db.Integer, db.ForeignKey('businesses.id'), unique=True)
    business = db.relationship('Business', back_populates='admin_user')

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'is_super_admin': self.is_super_admin
        }

class Business(db.Model):
    __tablename__ = 'businesses'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    address = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    email = db.Column(db.String(120), unique=True, nullable=True)
    
    admin_user = db.relationship('Admin', back_populates='business', uselist=False)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'address': self.address,
            'phone': self.phone,
            'email': self.email
        }
    
class Service(db.Model):
    __tablename__ = 'services'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    
    categories = db.relationship('Category', backref='service', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
        }

class Category(db.Model):
    __tablename__ = 'categories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    
    service_id = db.Column(db.Integer, db.ForeignKey('services.id'), nullable=False)
    
    items = db.relationship('Item', backref='category', lazy=True)
    
    __table_args__ = (db.UniqueConstraint('name', 'service_id', name='_category_service_uc'),)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'service_id': self.service_id
        }
    
class Item(db.Model):
    __tablename__ = 'items'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    price = db.Column(db.Float, nullable=False)
    units = db.Column(db.Integer, nullable=False, default=1)
    description = db.Column(db.String(255), nullable=True) 
    
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False)
    # Cambiado a nullable=True para permitir artículos globales/huérfanos (business_id=NULL)
    business_id = db.Column(db.Integer, db.ForeignKey('businesses.id'), nullable=True) 


# --- COMANDOS CLI ---
@app.cli.command("seed_database")
def seed_database():
    if not Service.query.first():
        print("Poblando la base de datos con servicios y categorías iniciales...")
        tintoreria = Service(name="Tintorería")
        planchado = Service(name="Planchado")
        sastreria = Service(name="Sastrería")
        miscelanea = Service(name="Miscelánea")
        db.session.add_all([tintoreria, planchado, sastreria, miscelanea])
        db.session.commit()
        trajes = Category(name="Trajes", service=tintoreria)
        camisas = Category(name="Camisas", service=planchado)
        vestidos = Category(name="Vestidos", service=tintoreria)
        pantalones = Category(name="Pantalones", service=planchado)
        db.session.add_all([trajes, camisas, vestidos, pantalones])
        db.session.commit()
        print("¡Base de datos poblada exitosamente!")
    else:
        print("Los servicios y categorías iniciales ya existen. No se hicieron cambios.")


# --- PARSERS ---
login_parser = reqparse.RequestParser()
login_parser.add_argument('username', type=str, required=True, help="El nombre de usuario es obligatorio")
login_parser.add_argument('password', type=str, required=True, help="La contraseña es obligatoria")

category_parser = reqparse.RequestParser()
category_parser.add_argument('name', type=str, required=True, help="El nombre de la categoría es obligatorio")

category_put_args = reqparse.RequestParser()
category_put_args.add_argument("name", type=str, required=True, help="Name of the category is required")

item_parser = reqparse.RequestParser()
item_parser.add_argument('name', type=str, required=True, help="El nombre del artículo es obligatorio")
item_parser.add_argument('description', type=str, required=False, default="")
item_parser.add_argument('price', type=float, required=True, help="El precio del artículo es obligatorio")
item_parser.add_argument('units', type=int, required=False, default=1, help="Número de unidades del artículo")

item_update_parser = reqparse.RequestParser()
item_update_parser.add_argument('name', type=str, required=False)
item_update_parser.add_argument('description', type=str, required=False)
item_update_parser.add_argument('price', type=float, required=False)
item_update_parser.add_argument('units', type=int, required=False)


# --- RECURSOS (ENDPOINTS) ---

class AdminRegistration(Resource):
    def post(self):
        # Lógica de registro de Super Admin (inicial)
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        if Admin.query.filter_by(username=username).first():
            return {"message": "El nombre de usuario ya existe"}, 409
        hashed_password = generate_password_hash(password)
        new_admin = Admin(username=username, password=hashed_password, is_super_admin=True) # Creamos el primer usuario como SA
        db.session.add(new_admin)
        db.session.commit()
        return {"message": "Administrador Super Admin creado exitosamente"}, 201

class BusinessCreation(Resource):
    @super_admin_required()
    def post(self):
        # Lógica para crear un negocio y su admin asociado
        data = request.get_json()
        business_name = data.get('business_name')
        # ... (rest of data extraction) ...
        admin_username = data.get('admin_username')
        admin_password = data.get('admin_password')

        if not business_name or not admin_username or not admin_password:
            return {"message": "Faltan datos de negocio o de administrador"}, 400
        
        # Validaciones de unicidad y hash de password
        if Admin.query.filter_by(username=admin_username).first():
            return {"message": "El nombre de usuario para el administrador ya existe"}, 409
        if Business.query.filter_by(name=business_name).first():
            return {"message": "Un negocio con este nombre ya existe"}, 409
            
        hashed_password = generate_password_hash(admin_password)
        new_admin = Admin(
            username=admin_username, 
            password=hashed_password, 
            is_super_admin=False # Importante: No es Super Admin
        )
        new_business = Business(
            name=business_name,
            address=data.get('business_address'),
            phone=data.get('business_phone'),
            email=data.get('business_email'),
            admin_user=new_admin # Relación establecida
        )
        try:
            db.session.add(new_business)
            db.session.commit()
            return {"message": "Negocio y administrador creados exitosamente"}, 201
        except Exception as e:
            db.session.rollback()
            return {"message": "Error al crear el negocio", "error": str(e)}, 500

class BusinessResource(Resource):
    @super_admin_required()
    def post(self):
        # Lógica para crear un negocio
        # Nota: Idealmente se usa BusinessCreation para crear admin + negocio, pero mantenemos esta por si es necesaria
        parser = reqparse.RequestParser()
        parser.add_argument('name', type=str, required=True)
        parser.add_argument('address', type=str, required=True)
        parser.add_argument('admin_id', type=int, required=True)
        args = parser.parse_args()
        
        try:
            new_business = Business(name=args['name'], address=args['address'])
            db.session.add(new_business)
            
            admin_user = Admin.query.get(args['admin_id'])
            if admin_user:
                admin_user.business_id = new_business.id # Asignar negocio al admin
            
            db.session.commit()
            return new_business.to_dict(), 201
        except Exception as e:
            db.session.rollback()
            return {"message": "Error al crear el negocio", "error": str(e)}, 500

    @super_admin_required()
    def get(self):
        # Listar todos los negocios
        businesses = Business.query.order_by(Business.name).all()
        return {"businesses": [business.to_dict() for business in businesses]}, 200

class BusinessByIdResource(Resource):
    @super_admin_required()
    def get(self, business_id):
        # Obtener un negocio
        business = Business.query.get_or_404(business_id)
        return business.to_dict(), 200

    @super_admin_required()
    def put(self, business_id):
        # Actualizar un negocio
        business = Business.query.get_or_404(business_id)
        data = request.get_json()
        business.name = data.get('name', business.name)
        # ... (rest of updates) ...
        db.session.commit()
        return {"message": "Negocio actualizado correctamente"}, 200

    @super_admin_required()
    def delete(self, business_id):
        # Eliminar un negocio
        business = Business.query.get_or_404(business_id)
        db.session.delete(business)
        db.session.commit()
        return {"message": "Negocio eliminado correctamente"}, 200

class ServiceListResource(Resource):
    @jwt_required()
    def get(self):
        # Listar todos los servicios
        services = Service.query.all()
        return {"services": [service.to_dict() for service in services]}, 200

    @super_admin_required()
    def post(self):
        # Crear un servicio
        args = service_parser.parse_args()
        service_name = args['name']
        existing_service = Service.query.filter_by(name=service_name).first()
        if existing_service:
            return {"message": "Ya existe un servicio con este nombre"}, 409
        new_service = Service(name=service_name)
        db.session.add(new_service)
        db.session.commit()
        return {"message": "Servicio creado exitosamente", "id": new_service.id, "name": new_service.name}, 201

class ServiceResource(Resource):
    @jwt_required()
    def get(self, service_id):
        # Obtener un servicio
        service = Service.query.get_or_404(service_id)
        return service.to_dict(), 200
    
    @super_admin_required()
    def put(self, service_id):
        # Actualizar un servicio
        data = request.get_json()
        service = Service.query.get_or_404(service_id)
        service.name = data.get('name', service.name)
        db.session.commit()
        return service.to_dict(), 200

    @super_admin_required()
    def delete(self, service_id):
        # Eliminar un servicio
        service = Service.query.get_or_404(service_id)
        db.session.delete(service)
        db.session.commit()
        return {"message": "Servicio eliminado exitosamente"}, 200

class CategoryResource(Resource):
    @jwt_required()
    def get(self, service_id):
        # Listar categorías por servicio
        service = Service.query.get_or_404(service_id)
        categories = Category.query.filter_by(service_id=service_id).order_by(Category.name).all()
        result = [{"id": cat.id, "name": cat.name, "service_id": service.id} for cat in categories]
        return {"categories": result}, 200

    @super_admin_required()
    def post(self, service_id):
        # Crear una categoría
        service = Service.query.get_or_404(service_id)
        args = category_parser.parse_args()
        category_name = args['name']
        if Category.query.filter_by(name=category_name, service_id=service_id).first():
            return {"message": "La categoría ya existe para este servicio"}, 409
        new_category = Category(name=category_name, service_id=service_id)
        db.session.add(new_category)
        db.session.commit()
        return {"message": "Categoría creada exitosamente", "id": new_category.id, "name": new_category.name}, 201

class CategoryByIdResource(Resource):
    @jwt_required()
    def get(self, category_id):
        # Obtener una categoría
        category = Category.query.get_or_404(category_id)
        return category.to_dict(), 200

    @super_admin_required()
    def put(self, category_id):
        # Actualizar una categoría
        args = category_put_args.parse_args()
        category = Category.query.get_or_404(category_id)
        category.name = args['name']
        db.session.commit()
        return {"message": "Category updated successfully"}, 200

    @super_admin_required()
    def delete(self, category_id):
        # Eliminar una categoría
        category = Category.query.get_or_404(category_id)
        
        # Eliminar ítems asociados primero
        Item.query.filter_by(category_id=category_id).delete()
        
        db.session.delete(category)
        db.session.commit()
        return {"message": "Categoría eliminada exitosamente"}, 200

# Clase para listar y crear artículos
class ItemResource(Resource):
    @jwt_required()
    def post(self, category_id):
        claims = get_jwt()
        
        if claims["is_super_admin"]:
            # Super Admin puede crear artículos para cualquier negocio (debe especificar business_id)
            parser_sa = item_parser.copy()
            parser_sa.add_argument('business_id', type=int, required=True, help="El ID del negocio es obligatorio para Super Admin")
            args = parser_sa.parse_args()
            business_id = args['business_id']
        else:
            # Business Admin crea artículos para su propio negocio
            args = item_parser.parse_args()
            business_id = claims.get('business_id')
            if not business_id:
                return {"message": "Token de administrador de negocio inválido o sin business_id"}, 403

        category = Category.query.get_or_404(category_id)
        
        new_item = Item(
            name=args['name'],
            description=args.get('description', ""),
            price=args['price'],
            units=args['units'],
            category_id=category_id,
            business_id=business_id
        )

        try:
            db.session.add(new_item)
            db.session.commit()
            return {
                "message": "Artículo creado exitosamente",
                "id": new_item.id, "name": new_item.name, 
                "description": new_item.description,
                "price": float(new_item.price),
                "units": new_item.units, "category_id": new_item.category_id,
                "business_id": new_item.business_id
            }, 201
        except Exception as e:
            db.session.rollback()
            return {"message": "Error al crear el artículo", "error": str(e)}, 500


    @jwt_required()
    def get(self, category_id):
        claims = get_jwt()
        
        # --- LÓGICA DE FILTRADO Y RESTRICCIÓN AMPLIADA (INCLUYE NULL Y 0) ---
        if not claims["is_super_admin"]:
            business_id = claims.get('business_id')
            
            if not business_id:
                return {"message": "Acceso denegado. Se requiere un rol de administrador de negocio válido."}, 403
            
            # FILTRAR por category_id Y (pertenece al usuario O no tiene asignación)
            items_query = Item.query.filter(
                Item.category_id == category_id,
                db.or_(
                    Item.business_id == business_id,
                    Item.business_id.is_(None), # Artículos globales (NULL)
                    Item.business_id == 0       # Artículos globales (0)
                )
            )
        
        else: # Es Super Admin
            # El Super Admin ve todos los artículos de esa categoría.
            items_query = Item.query.filter_by(category_id=category_id)
        # ---------------------------------------------------

        category = Category.query.get_or_404(category_id) # Usar get_or_404 para la categoría
            
        items = items_query.order_by(Item.name).all()

        items_list = []
        for item in items:
            items_list.append({
                "id": item.id, "name": item.name, "price": float(item.price), 
                "description": item.description,
                "units": item.units, "business_id": item.business_id,
                "category_id": item.category_id
            })
        return {"items": items_list, "category_name": category.name}, 200

# Clase para gestionar un solo artículo (GET, PUT, DELETE)
class ItemDetailResource(Resource):
    
    # Lógica de verificación de propiedad común para PUT/DELETE
    def _check_ownership(self, item_id):
        item = Item.query.get_or_404(item_id)
        claims = get_jwt()
        user_business_id = claims.get('business_id')
        is_global = item.business_id is None or item.business_id == 0

        # Reglas de acceso:
        # 1. SA siempre puede acceder.
        if claims["is_super_admin"]:
            return item, 200
        
        # 2. BA puede acceder si: (es su artículo) O (es un artículo global)
        if item.business_id == user_business_id or is_global:
            return item, 200
        
        # 3. Denegar acceso
        return None, 404

    @jwt_required()
    def get(self, item_id):
        item, status = self._check_ownership(item_id)
        if status != 200:
            return {"message": "Artículo no encontrado o no autorizado"}, 404
            
        return {
            "id": item.id,
            "name": item.name,
            "description": item.description,
            "price": float(item.price), 
            "units": item.units,
            "business_id": item.business_id,
            "category_id": item.category_id
        }, 200
    
    @jwt_required()
    def put(self, item_id):
        item, status = self._check_ownership(item_id)
        if status != 200:
            return {"message": "Acceso no autorizado para modificar este artículo"}, 403
            
        args = item_update_parser.parse_args()
        
        # Actualizar solo los campos proporcionados
        if args['name'] is not None:
            item.name = args['name']
        if args['description'] is not None:
            item.description = args['description']
        if args['price'] is not None:
            item.price = args['price']
        if args['units'] is not None:
            item.units = args['units']
            
        db.session.commit()
        return {"message": "Artículo actualizado exitosamente"}, 200
    
    @jwt_required()
    def delete(self, item_id):
        item, status = self._check_ownership(item_id)
        if status != 200:
            return {"message": "Acceso no autorizado para eliminar este artículo"}, 403
            
        db.session.delete(item)
        db.session.commit()
        return {"message": "Artículo eliminado exitosamente"}, 204


class LoginResource(Resource):
    def post(self):
        args = login_parser.parse_args()
        username = args['username']
        password = args['password']
        admin = Admin.query.filter_by(username=username).first()

        if not admin or not check_password_hash(admin.password, password):
            return {"message": "Nombre de usuario o contraseña incorrectos"}, 401

        # Define los 'claims'
        additional_claims = {
            "is_super_admin": admin.is_super_admin,
            "business_id": admin.business_id if not admin.is_super_admin else None
        }
        
        access_token = create_access_token(identity=str(admin.id), additional_claims=additional_claims)

        # Devuelve el token, el rol y el business_id
        return {
            "access_token": access_token,
            "role": "super_admin" if admin.is_super_admin else "business_admin",
            "business_id": admin.business_id if not admin.is_super_admin else None
        }, 200

# Endpoint protegido para pruebas
class ProtectedResource(Resource):
    @jwt_required()
    def get(self):
        return {"message": "Este es un endpoint protegido. ¡Tienes acceso!"}, 200


# --- CONFIGURACIÓN DE RUTAS ---
api.add_resource(AdminRegistration, '/register_admin') # Para el primer SA (registro global)
api.add_resource(BusinessCreation, '/register_business') # Para SA que crea un BA+Negocio
api.add_resource(LoginResource, '/login')
api.add_resource(ProtectedResource, '/protected', endpoint='protected_resource')

# Rutas para Servicios
api.add_resource(ServiceListResource, '/services') 
api.add_resource(ServiceResource, '/services/<int:service_id>')

# Rutas para Categorías
api.add_resource(CategoryResource, '/services/<int:service_id>/categories', endpoint='categories_list')
api.add_resource(CategoryByIdResource, '/categories/<int:category_id>', endpoint='category_by_id')

# Rutas para Artículos
api.add_resource(ItemResource, '/categories/<int:category_id>/items', endpoint='items_list')
api.add_resource(ItemDetailResource, '/items/<int:item_id>', endpoint='item_by_id')

# Rutas para Negocios
api.add_resource(BusinessResource, '/businesses', endpoint='businesses_list')
api.add_resource(BusinessByIdResource, '/businesses/<int:business_id>', endpoint='business_by_id')

if __name__ == '__main__':
    # Asegúrate de que las tablas existan al iniciar
    with app.app_context():
        # db.create_all() # No usamos create_all si estamos usando Flask-Migrate
        pass
    app.run(debug=True)