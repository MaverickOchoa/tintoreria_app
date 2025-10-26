from flask import Flask, request, jsonify
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_restful import Api, Resource, reqparse
from flask_migrate import Migrate
from flask_login import UserMixin
from flask_cors import CORS
from sqlalchemy import UniqueConstraint, or_
import traceback # Importa el módulo traceback para errores completos
from sqlalchemy.orm import joinedload   # Creación de la app
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
def get_admin_claims():
    """
    Función auxiliar para obtener los claims (cargos) del token JWT actual.
    """
    try:
         # get_jwt() es la forma moderna de obtener todos los claims
        return get_jwt()
    except Exception:
        # Devuelve un diccionario vacío si falla (ej: token no válido o ausente)
        return {}

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
            # Esta lógica siempre fue problemática: "if claims.get("is_super_admin", True):"
            # Un BA debe tener is_super_admin=False. La mantendré como estaba en el original.
            # Mejoraríamos esto revisando el rol más que si es SA o no, pero siguiendo la estructura original:
            if claims.get("is_super_admin", False): # Debería ser False para permitir a BA
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
    # NUEVA COLUMNA: Para asociar Gerentes/Empleados a una sucursal específica
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=True)

    business = db.relationship('Business', back_populates='admin_user')
    branch = db.relationship('Branch', back_populates='users')

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
    # Relación branches es correcta
    branches = db.relationship('Branch', backref='owner_business', lazy=True, cascade="all, delete-orphan")
    
    # 🔑 CORRECCIÓN CLAVE: Aceptar el nuevo parámetro 'include_branches' con valor por defecto False
    def to_dict(self, include_branches=False): 
        data = {
            'id': self.id,
            'name': self.name,
            'address': self.address,
            'phone': self.phone,
            'email': self.email
        }
        
        # 🔑 ANIDACIÓN: Incluir sucursales si el argumento es True
        if include_branches:
            # Serializa la lista de sucursales usando Branch.to_dict()
            # Asegúrate de que el modelo Branch tenga su propio .to_dict()
            data['branches'] = [branch.to_dict() for branch in self.branches]
            
        return data

# NUEVO MODELO BRANCH (SUCURSAL)
class Branch(db.Model):
    __tablename__ = 'branches'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(255), nullable=True)
    # VINCULACIÓN: CADA Sucursal pertenece a UN Business Corporativo
    business_id = db.Column(db.Integer, db.ForeignKey('businesses.id'), nullable=False)
    
    # RELACIONES: Items y Users (Empleados)
    items = db.relationship('Item', backref='location', lazy=True, cascade="all, delete-orphan")
    users = db.relationship('Admin', back_populates='branch', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'address': self.address,
            'business_id': self.business_id,
        }

class Client(db.Model):
    __tablename__ = 'clients'
    id = db.Column(db.Integer, primary_key=True)
    # 🔑 CLAVE: El nombre completo del cliente
    full_name = db.Column(db.String(150), nullable=False)
    # 🔑 CLAVE: Número de teléfono (se usará para búsquedas rápidas)
    phone = db.Column(db.String(20), nullable=False, index=True) 
    email = db.Column(db.String(120), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    
    # 🔑 VINCULACIÓN: Cliente registrado en una sucursal específica (opcionalmente)
    # Esto es útil para saber qué sucursal lo creó, aunque podría usar cualquiera del negocio.
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=True) 
    
    # Relación de vuelta con Branch
    branch = db.relationship('Branch', backref='registered_clients', lazy=True)
    
    # Pendiente: Relación a órdenes (se añadirá en el siguiente paso)

    # Restricción: No puede haber dos clientes con el mismo teléfono en el mismo negocio
    # (Aunque por ahora solo tenemos business_id en Admin, lo pondremos a nivel global para simplificar)
    __table_args__ = (db.UniqueConstraint('phone', name='_phone_uc'),) 
    
    def to_dict(self):
        return {
            'id': self.id,
            'full_name': self.full_name,
            'phone': self.phone,
            'email': self.email,
            'notes': self.notes,
            'branch_id': self.branch_id
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
    # CAMBIO CRÍTICO: Reemplazamos business_id por branch_id.
    # NULL indica un Artículo Maestro (Plantilla Global).
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=True)


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

branch_parser = reqparse.RequestParser()
branch_parser.add_argument("name", type=str, required=True, help="El nombre de la sucursal es requerido", location="json")
branch_parser.add_argument("address", type=str, required=True, help="La dirección de la sucursal es requerida", location="json")


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
        data = request.get_json()
        
        business_name = data.get('business_name').title() if data.get('business_name') else None
        business_address = data.get('business_address').title() if data.get('business_address') else None
        
        admin_username = data.get('admin_username')
        admin_password = data.get('admin_password')

        if not business_name or not admin_username or not admin_password or not business_address:
            return {"message": "Faltan datos de negocio (nombre, dirección) o de administrador"}, 400
        
        if Admin.query.filter_by(username=admin_username).first():
            return {"message": "El nombre de usuario para el administrador ya existe"}, 409
        if Business.query.filter_by(name=business_name).first():
            return {"message": "Un negocio con este nombre ya existe"}, 409
            
        hashed_password = generate_password_hash(admin_password)
        new_admin = Admin(
            username=admin_username,
            password=hashed_password,
            is_super_admin=False
        )
        new_business = Business(
            name=business_name,
            address=business_address,
            phone=data.get('business_phone'),
            email=data.get('business_email'),
            admin_user=new_admin # Esto vincula new_admin.business_id
        )

        try:
            # 1. Agrega el negocio y el admin (obtenemos business.id y admin.id)
            db.session.add(new_business)
            db.session.commit() 

            # 2. Crea la sucursal, ahora con el business_id disponible
            new_branch = Branch(
                name=f"Principal ({new_business.name})",
                address=new_business.address,
                business_id=new_business.id 
            )
            db.session.add(new_branch)
            db.session.commit() # <--- SEGUNDO COMMIT: new_branch.id AHORA EXISTE

            # 3. Asigna la sucursal al administrador (¡Ahora new_branch.id tiene un valor!)
            new_admin.branch_id = new_branch.id
            db.session.commit() # <--- TERCER COMMIT: Actualiza el admin con branch_id
            
            # Nota: Si usas la relación de SQLAlchemy (new_admin.branch = new_branch), 
            # solo necesitarías el último commit, pero para ser explícitos, esta es la forma más segura.

            return {"message": "Negocio, administrador y sucursal principal creados exitosamente", "business_id": new_business.id, "branch_id": new_branch.id}, 201
        except Exception as e:
            db.session.rollback()
            return {"message": "Error al crear el negocio", "error": str(e)}, 500
        @super_admin_required()
        def post(self):
        # Lógica para crear un negocio y su admin asociado
            data = request.get_json()
            
            business_name = data.get('business_name').title() if data.get('business_name') else None
            business_address = data.get('business_address').title() if data.get('business_address') else None
            
            admin_username = data.get('admin_username')
            admin_password = data.get('admin_password')

            if not business_name or not admin_username or not admin_password or not business_address:
                return {"message": "Faltan datos de negocio (nombre, dirección) o de administrador"}, 400
            
            if Admin.query.filter_by(username=admin_username).first():
                return {"message": "El nombre de usuario para el administrador ya existe"}, 409
            if Business.query.filter_by(name=business_name).first():
                return {"message": "Un negocio con este nombre ya existe"}, 409
                
            hashed_password = generate_password_hash(admin_password)
            new_admin = Admin(
                username=admin_username,
                password=hashed_password,
                is_super_admin=False
            )
            new_business = Business(
                name=business_name,
                address=business_address,
                phone=data.get('business_phone'),
                email=data.get('business_email'),
                admin_user=new_admin
            )

            try:
                # 1. Agrega el negocio y el admin (esto los prepara, pero el ID aún no está disponible)
                db.session.add(new_business)
                db.session.commit() # <--- COMMIT TEMPORAL PARA OBTENER EL ID DEL NEGOCIO

                # 2. El ID del negocio ahora existe y se puede acceder a través de new_business.id
                new_branch = Branch(
                    name=f"Principal ({new_business.name})",
                    address=new_business.address,
                    # Ahora new_business.id TIENE UN VALOR
                    business_id=new_business.id 
                )
                
                # 3. Asigna la sucursal al Admin que creamos (opcional pero bueno)
                new_admin.branch_id = new_branch.id
                
                db.session.add(new_branch)
                db.session.commit()
                
                return {"message": "Negocio, administrador y sucursal principal creados exitosamente", "business_id": new_business.id, "branch_id": new_branch.id}, 201
            except Exception as e:
                db.session.rollback()
                return {"message": "Error al crear el negocio", "error": str(e)}, 500

class BusinessResource(Resource):
    @super_admin_required()
    def post(self):
        # Lógica para crear un negocio
        parser = reqparse.RequestParser()
        parser.add_argument('name', type=str, required=True)
        parser.add_argument('address', type=str, required=True)
        parser.add_argument('admin_id', type=int, required=True)
        args = parser.parse_args()
        
        try:
            new_business = Business(name=args['name'].title(), address=args['address'].title())
            
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
        # 🔑 CORRECCIÓN DEL ERROR 500: Usar joinedload para cargar la relación 'branches' 
        # junto con la consulta principal de Business.
        businesses = Business.query \
            .options(joinedload(Business.branches)) \
            .order_by(Business.name) \
            .all()
        
        # Serialización con la inclusión de sucursales (Ahora es segura)
        business_data = [
            business.to_dict(include_branches=True)
            for business in businesses
        ]
        
        return {"businesses": business_data}, 200

class BusinessByIdResource(Resource):
    
    # 🔑 CORRECCIÓN: Cambiado de @super_admin_required() a @jwt_required()
    @jwt_required()
    def get(self, business_id):
        
        claims = get_admin_claims() # Usar la función auxiliar
        user_is_sa = claims.get('is_super_admin', False)
        user_business_id = claims.get('business_id')

        # 1. Buscar el negocio
        business = Business.query.get(business_id) 

        if not business:
            return {"message": "Negocio no encontrado"}, 404
        
        # 2. Lógica de Autorización
        is_owner_admin = (
            not user_is_sa and # Si NO es Super Admin
            user_business_id is not None and # Y tiene un business_id en su token
            user_business_id == business_id # Y el ID solicitado coincide
        )

        if not user_is_sa and not is_owner_admin:
            # Denegar si no es Super Admin Y no es el Admin del negocio solicitado
            return {"message": "Acceso denegado: Solo el Super Administrador o el Administrador de este Negocio pueden acceder a este recurso"}, 403

        # 3. Si la autorización es exitosa, devuelve los datos
        # No usamos include_branches=True para que la carga sea más rápida
        return business.to_dict(include_branches=False), 200

    @super_admin_required()
    def put(self, business_id):
        # Actualizar un negocio
        business = Business.query.get_or_404(business_id)
        data = request.get_json()
        
        name = data.get('name')
        address = data.get('address')

        if name is not None:
            business.name = name.title()
        
        if address is not None:
            business.address = address.title()
        
        business.phone = data.get('phone', business.phone)
        business.email = data.get('email', business.email)

        db.session.commit()
        return {"message": "Negocio actualizado correctamente"}, 200

    @super_admin_required()
    def delete(self, business_id):
        # Eliminar un negocio
        business = Business.query.get_or_404(business_id)
        db.session.delete(business)
        db.session.commit()
        return {"message": "Negocio eliminado correctamente"}, 200



# --- NUEVOS RECURSOS DE SUCURSAL ---
class BranchResource(Resource):
    
    # ---------------------------------------------------
    # 🔑 MÉTODO POST (Creación - Movido de BranchCreationResource)
    @super_admin_required()
    def post(self, business_id):
        args = branch_parser.parse_args()
        # Nota: business_id ya está en la URL
        business = Business.query.get_or_404(business_id) 

        new_branch = Branch(
            name=args["name"].title(),
            address=args["address"].title(),
            business_id=business_id # Asignación CLAVE
        )

        try:
            db.session.add(new_branch)
            db.session.commit()
            # Asegúrate de que este retorno coincide con lo que el frontend espera (data.branch.name)
            return {
                "message": "Sucursal creada exitosamente",
                "branch": { # 🚨 ANIDANDO LA RESPUESTA PARA EL FRONTEND 🚨
                    "id": new_branch.id,
                    "name": new_branch.name,
                    "business_id": new_branch.business_id
                }
            }, 201
        except Exception as e:
            db.session.rollback()
            return {"message": "Error al crear la sucursal", "error": str(e)}, 500
    # ---------------------------------------------------

    # ---------------------------------------------------
    # 🔑 MÉTODO GET (Listado - Lógica de filtrado que ya tenías)
    @jwt_required()
    def get(self, business_id):
        claims = get_jwt()
        
        business = Business.query.get_or_404(business_id)

        # Control de Permisos (tu lógica de seguridad)
        if not claims["is_super_admin"]:
            user_business_id = claims.get('business_id')
            if user_business_id != business_id:
                return {"message": "Acceso denegado. No es administrador de este negocio."}, 403
        
        # Obtener Sucursales (Filtro correcto)
        branches = Branch.query.filter_by(business_id=business_id).order_by(Branch.name).all()
        
        return {"branches": [b.to_dict() for b in branches], "business_name": business.name}, 200
    @super_admin_required()
    def post(self, business_id):
        args = branch_parser.parse_args()
        business = Business.query.get_or_404(business_id)

        new_branch = Branch(
            name=args["name"].title(),
            address=args["address"].title(),
            business_id=business_id
        )

        try:
            db.session.add(new_branch)
            db.session.commit()
            return {
                "message": "Sucursal creada exitosamente",
                "id": new_branch.id,
                "name": new_branch.name,
                "business_id": new_branch.business_id
            }, 201
        except Exception as e:
            db.session.rollback()
            return {"message": "Error al crear la sucursal", "error": str(e)}, 500

    @jwt_required()
    def get(self, business_id):
        claims = get_jwt()
        
        business = Business.query.get_or_404(business_id)

        # Control de Permisos
        if not claims["is_super_admin"]:
            user_business_id = claims.get('business_id')
            if user_business_id != business_id:
                return {"message": "Acceso denegado. No es administrador de este negocio."}, 403
        
        # Obtener Sucursales
        branches = Branch.query.filter_by(business_id=business_id).order_by(Branch.name).all()
        
        return {"branches": [b.to_dict() for b in branches], "business_name": business.name}, 200

    
class BranchDetailResource(Resource):
    
    def _check_ownership(self, branch_id):
        # Nota: Branch.query.get_or_404(branch_id) ya verifica si existe
        branch = Branch.query.get_or_404(branch_id) 
        claims = get_jwt()
        
        if claims["is_super_admin"]:
            return branch, 200, True # Branch, Status, is_super_admin
        
        # Business Admin
        user_business_id = claims.get('business_id')
        if branch.business_id == user_business_id:
            return branch, 200, False
        
        return None, 403, False

    @jwt_required()
    def get(self, branch_id):
        branch, status, _ = self._check_ownership(branch_id)
        if status != 200:
            return {"message": "Sucursal no encontrada o no autorizado para ver"}, status
        
        return branch.to_dict(), 200

    @jwt_required()
    def put(self, branch_id):
        branch, status, _ = self._check_ownership(branch_id)
        if status != 200:
            return {"message": "Acceso no autorizado para modificar esta sucursal."}, status
        
        args = branch_parser.parse_args()
        
        branch.name = args['name'].title()
        branch.address = args['address'].title()
            
        try:
            db.session.commit()
            return {"message": "Sucursal actualizada exitosamente"}, 200
        except Exception as e:
            db.session.rollback()
            return {"message": "Error al actualizar la sucursal", "error": str(e)}, 500

    # 🔑 MÉTODO DELETE CORREGIDO:
    @super_admin_required()
    def delete(self, branch_id):
        
        # Usamos get() en lugar de get_or_404() para manejar el 404 manualmente 
        # y retornar un JSON consistente en Flask-RESTful.
        branch = Branch.query.get(branch_id)
        
        if not branch:
            return {"message": f"Sucursal con ID {branch_id} no encontrada."}, 404
        
        try:
            db.session.delete(branch)
            db.session.commit()
            
            # 🔑 Código de estado 204 (No Content) es estándar para una eliminación exitosa sin cuerpo de respuesta.
            return None, 204 
            
        except Exception as e:
            db.session.rollback()
            return {"message": "Error al eliminar la sucursal", "error": str(e)}, 500
        
class BranchCreationResource(Resource):
    @jwt_required()
    # 🚨 NOTA: DEBES CREAR Y USAR UN DECORADOR PERSONALIZADO PARA VERIFICAR EL ROL
    # @super_admin_required 
    def post(self, business_id):
        # Verificar el rol manualmente si no tienes el decorador
        claims = get_jwt()
        if not claims.get('is_super_admin'):
             return {"message": "Permiso denegado. Solo Super Admin puede crear sucursales."}, 403
        
        # 1. Validar la existencia del negocio
        business = Business.query.get(business_id)
        if not business:
            return {"message": f"Negocio con ID {business_id} no encontrado."}, 404

        args = branch_creation_parser.parse_args()
        name = args['name']
        address = args['address']

        # 2. Crear la nueva sucursal
        new_branch = Branch(
            name=name,
            address=address,
            business_id=business_id # Asocia la sucursal al negocio
        )

        try:
            db.session.add(new_branch)
            db.session.commit()
            
            # 3. Devolver la respuesta de éxito
            return {
                "message": "Sucursal creada exitosamente.",
                "branch": {
                    "id": new_branch.id,
                    "name": new_branch.name,
                    "address": new_branch.address
                }
            }, 201
        except Exception as e:
            db.session.rollback()
            return {"message": "Error al crear la sucursal.", "error": str(e)}, 500


class ServiceListResource(Resource):
    @jwt_required()
    def get(self):
        try:
            # 🚨 Lógica que falla
            services = Service.query.all()
            return {"services": [service.to_dict() for service in services]}, 200
        
        except Exception as e:
            # Esto imprimirá la traza completa del error en tu consola de Flask
            traceback.print_exc() 
            print(f"ERROR al listar servicios: {e}")
            
            # Devuelve un 500 para que el frontend no se quede cargando
            return {"message": "Error interno del servidor al listar servicios. Revisa la consola del servidor."}, 500

    @super_admin_required()
    def post(self):
        # Crear un servicio
        parser = reqparse.RequestParser()
        parser.add_argument('name', type=str, required=True)
        args = parser.parse_args()
        
        service_name = args['name'].title()

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
        service = Service.query.get_or_404(service_id)
        data = request.get_json()
        
        name = data.get('name', service.name)
        
        service.name = name.title()
        
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
        
        category_name = args['name'].title()

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
        
        category.name = args['name'].title()
        
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

# ----------------------------------------------------------------------
# CLASE PARA LISTAR Y CREAR ARTÍCULOS (ItemResource)
# LÓGICA MODIFICADA PARA USAR branch_id
# ----------------------------------------------------------------------
class ItemResource(Resource):
    @jwt_required()
    def post(self, category_id):
        claims = get_jwt()
        args = item_parser.parse_args()
        
        if claims["is_super_admin"]:
            # SA puede crear Artículos MAESTROS (branch_id = None)
            parser_sa = item_parser.copy()
            # branch_id es OPCIONAL para SA (si no lo envía, se crea como Artículo Maestro)
            parser_sa.add_argument('branch_id', type=int, required=False, default=None)
            args = parser_sa.parse_args()
            
            branch_id_to_assign = args.get('branch_id')
            
            # Opcional: Si el SA intenta crear un artículo para un Branch que no existe
            if branch_id_to_assign is not None and not Branch.query.get(branch_id_to_assign):
                 return {"message": f"La Sucursal con ID {branch_id_to_assign} no existe."}, 404

        else:
            # Business Admin crea artículos para UNA sucursal de SU negocio (branch_id OBLIGATORIO)
            business_id = claims.get('business_id')
            if not business_id:
                return {"message": "Token de administrador de negocio inválido o sin business_id"}, 403
            
            # El BA debe pasar el branch_id en el payload (temporalmente usamos item_parser)
            parser_ba = item_parser.copy()
            parser_ba.add_argument('branch_id', type=int, required=True, help="El ID de la sucursal es obligatorio para el Administrador de Negocio")
            args = parser_ba.parse_args()
            branch_id_to_assign = args.get('branch_id')
            
            # 1. Verificar que la sucursal exista y pertenezca al Business Admin
            branch = Branch.query.get(branch_id_to_assign)
            if not branch or branch.business_id != business_id:
                return {"message": "Sucursal inválida o no pertenece a su negocio."}, 403


        category = Category.query.get_or_404(category_id)
        
        name_title_cased = args['name'].title()
        description_title_cased = args.get('description', "").title()

        new_item = Item(
            name=name_title_cased,
            description=description_title_cased,
            price=args['price'],
            units=args['units'],
            category_id=category_id,
            branch_id=branch_id_to_assign # Será el ID del Branch o None (Maestro)
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
                "branch_id": new_item.branch_id
            }, 201
        except Exception as e:
            db.session.rollback()
            return {"message": "Error al crear el artículo", "error": str(e)}, 500


    @jwt_required()
    def get(self, category_id):
        claims = get_jwt()
        
        # LÓGICA DE LECTURA FILTRADA POR ROL (Artículos Maestros y Sucursal)
        
        if claims["is_super_admin"]:
            # Super Admin: SOLO ve Artículos MAESTROS (branch_id es NULL)
            items_query = Item.query.filter(
                Item.category_id == category_id,
                Item.branch_id.is_(None)
            )
        
        else: # Es Business Admin
            # El BA debe especificar el branch_id por Query Param (ej: /items?branch_id=5)
            branch_id = request.args.get('branch_id', type=int)
            corporate_business_id = claims.get('business_id')

            if not branch_id or not corporate_business_id:
                return {"message": "Acceso denegado. Se requiere 'branch_id' y un rol de administrador de negocio válido."}, 403
            
            # Validación de Propiedad del Branch
            branch = Branch.query.get(branch_id)
            if not branch or branch.business_id != corporate_business_id:
                return {"message": "Sucursal inválida o no pertenece a su negocio."}, 403

            # Business Admin: Ve sus artículos asignados a ESA sucursal O Artículos MAESTROS (branch_id es NULL)
            items_query = Item.query.filter(
                Item.category_id == category_id,
                or_(
                    Item.branch_id == branch_id, # Artículos específicos de esa sucursal
                    Item.branch_id.is_(None) # Artículos Maestros
                )
            )

        category = Category.query.get_or_404(category_id)
        items = items_query.order_by(Item.name).all()

        items_list = []
        for item in items:
            items_list.append({
                "id": item.id, "name": item.name, "price": float(item.price),
                "description": item.description,
                "units": item.units, "branch_id": item.branch_id,
                "category_id": item.category_id
            })
        return {"items": items_list, "category_name": category.name}, 200

# ----------------------------------------------------------------------
# CLASE PARA GESTIONAR UN SOLO ARTÍCULO (ItemDetailResource)
# LÓGICA MODIFICADA PARA USAR branch_id
# ----------------------------------------------------------------------
class ItemDetailResource(Resource):
    
    def _check_ownership(self, item_id, check_write_permission=False):
        item = Item.query.get_or_404(item_id)
        claims = get_jwt()
        user_business_id = claims.get('business_id')

        # 1. Super Admin: Siempre puede ver, modificar y eliminar CUALQUIER artículo.
        if claims["is_super_admin"]:
            return item, 200
        
        # 2. Business Admin:
        
        # Permiso de LECTURA (GET): Puede ver los suyos o los Maestros
        if not check_write_permission:
            if item.branch_id is None:
                return item, 200 # Es un artículo Maestro
            
            # Es un artículo de una sucursal, verificar que la sucursal sea del BA
            item_branch = Branch.query.get(item.branch_id)
            if item_branch and item_branch.business_id == user_business_id:
                return item, 200
        
        # Permiso de ESCRITURA (PUT/DELETE): SOLO puede modificar los suyos
        if check_write_permission:
            # ¡NO Maestros!
            if item.branch_id is None:
                return None, 403 # No se pueden modificar Maestros
            
            # SOLO artículos de sus sucursales
            item_branch = Branch.query.get(item.branch_id)
            if item_branch and item_branch.business_id == user_business_id:
                return item, 200
        
        # 3. Denegar cualquier otro acceso
        return None, 404

    @jwt_required()
    def get(self, item_id):
        # GET: Usa _check_ownership con permiso de LECTURA (default)
        item, status = self._check_ownership(item_id, check_write_permission=False)
        if status != 200:
            return {"message": "Artículo no encontrado o no autorizado para ver"}, 404
            
        return {
            "id": item.id,
            "name": item.name,
            "description": item.description,
            "price": float(item.price),
            "units": item.units,
            "branch_id": item.branch_id,
            "category_id": item.category_id
        }, 200
    
    @jwt_required()
    def put(self, item_id):
        # PUT: Usa _check_ownership con permiso de ESCRITURA (True)
        item, status = self._check_ownership(item_id, check_write_permission=True)
        if status != 200:
            return {"message": "Acceso no autorizado para modificar este artículo. Solo puedes editar artículos asignados a tus sucursales."}, status
            
        args = item_update_parser.parse_args()
        
        # Actualizar solo los campos proporcionados
        if args['name'] is not None:
            item.name = args['name'].title()
        if args['description'] is not None:
            item.description = args['description'].title()
            
        if args['price'] is not None:
            item.price = args['price']
        if args['units'] is not None:
            item.units = args['units']
            
        db.session.commit()
        return {"message": "Artículo actualizado exitosamente"}, 200
    
    @jwt_required()
    def delete(self, item_id):
        # DELETE: Usa _check_ownership con permiso de ESCRITURA (True)
        item, status = self._check_ownership(item_id, check_write_permission=True)
        if status != 200:
            return {"message": "Acceso no autorizado para eliminar este artículo. Solo puedes eliminar artículos asignados a tus sucursales."}, status
            
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

        role = "super_admin" if admin.is_super_admin else "business_admin"
        
        # Inicialización de payloads
        business_id_payload = admin.business_id if not admin.is_super_admin else None
        branch_id_payload = None  # Se inicializa en None hasta que el BA seleccione
        branches_list = [] # <-- Nuevo: Lista de sucursales

        # --- LÓGICA DE OBTENCIÓN DE SUCURSALES (CAMBIO CLAVE) ---
        if role == "business_admin" and admin.business_id:
            # Buscar el negocio para obtener su lista de sucursales
            business = Business.query.get(admin.business_id)
            if business:
                # Mapear las sucursales a un formato de diccionario simple {id, name, address}
                branches_list = [branch.to_dict() for branch in business.branches]
            
            # Nota: No necesitamos el branch_id en las claims/token al inicio
            # La selección de branch se hace DESPUÉS del login.

        # Define los 'claims' para el JWT (no incluimos 'branches' aquí, solo en la respuesta)
        additional_claims = {
            "role": role, # Es útil tener el rol en el token
            "is_super_admin": admin.is_super_admin,
            "business_id": business_id_payload,
            "branch_id": branch_id_payload # Siempre None al inicio
        }
        
        access_token = create_access_token(identity=str(admin.id), additional_claims=additional_claims)

        # 🚨 CAMBIO CRÍTICO: Devolver la lista 'branches' en la respuesta JSON.
        return {
            "access_token": access_token,
            "role": role,
            "business_id": business_id_payload,
            "branch_id": branch_id_payload,
            "branches": branches_list  # <-- ¡ESTO ES LO QUE NECESITA EL FRONTEND!
        }, 200
    


 # --- PARSERS PARA CLIENTES ---
client_parser = reqparse.RequestParser()
client_parser.add_argument('full_name', type=str, required=True, help="El nombre completo del cliente es obligatorio", location='json')
client_parser.add_argument('phone', type=str, required=True, help="El número de teléfono es obligatorio y debe ser único", location='json')
client_parser.add_argument('email', type=str, required=False, location='json')
client_parser.add_argument('notes', type=str, required=False, location='json')
# NOTA: branch_id se obtendrá del token del admin/empleado, no se pide al usuario.

client_update_parser = reqparse.RequestParser(bundle_errors=True)
client_update_parser.add_argument('full_name', type=str, required=False, location='json')
client_update_parser.add_argument('phone', type=str, required=False, location='json')
client_update_parser.add_argument('email', type=str, required=False, location='json')
client_update_parser.add_argument('notes', type=str, required=False, location='json')
# --- FIN PARSERS PARA CLIENTES ---   

# --- RECURSOS (ENDPOINTS) DE CLIENTES ---
class ClientListResource(Resource):
    
    @jwt_required()
    def _get_business_id(self):
        """Función auxiliar para obtener el business_id del token o None si es SA."""
        claims = get_jwt()
        if claims.get('is_super_admin'):
            return None # SA puede ver todos los clientes
        
        # Asume que cualquier Business Admin o Empleado tiene un business_id
        user_business_id = claims.get('business_id')
        if not user_business_id:
             return {"message": "Permiso denegado: Usuario sin negocio asociado."}, 403
        
        return user_business_id
    
    @jwt_required()
    def post(self):
        # 1. Obtener datos y claims
        args = client_parser.parse_args()
        claims = get_jwt()
        
        user_branch_id = claims.get('branch_id')
        user_is_sa = claims.get('is_super_admin', False)

        # 2. Control de Permisos Básico: Solo SA y Admins/Empleados con branch_id pueden crear.
        if not user_is_sa and not user_branch_id:
             return {"message": "Permiso denegado: Solo el Super Admin o personal de Sucursal puede crear clientes."}, 403
             
        # 3. Verificar unicidad del teléfono
        if Client.query.filter_by(phone=args['phone']).first():
            return {"message": f"El teléfono {args['phone']} ya está registrado."}, 409
            
        # 4. Crear cliente
        new_client = Client(
            full_name=args['full_name'].title(),
            phone=args['phone'],
            email=args['email'],
            notes=args['notes'],
            # Asignar el branch_id del usuario que lo registra (si aplica)
            branch_id=user_branch_id if user_branch_id else None 
        )

        try:
            db.session.add(new_client)
            db.session.commit()
            return {"message": "Cliente registrado exitosamente", "client": new_client.to_dict()}, 201
        except Exception as e:
            db.session.rollback()
            return {"message": "Error al registrar cliente", "error": str(e)}, 500

    @jwt_required()
    def get(self):
        # 1. Búsqueda por query params (Ej: /api/v1/clients?phone=...)
        search_phone = request.args.get('phone', None)
        
        # 2. Obtener business_id para filtrar (None si es SA)
        user_business_id = self._get_business_id()
        if isinstance(user_business_id, dict): # Si devuelve un error 403
            return user_business_id

        query = Client.query.options(joinedload(Client.branch).joinedload(Branch.owner_business))
        
        # 3. Filtrar por Negocio (si no es Super Admin)
        if user_business_id is not None:
            # Filtra clientes cuya sucursal pertenece al negocio del usuario
            query = query.join(Client.branch).filter(Branch.business_id == user_business_id)

        # 4. Aplicar filtro de búsqueda por teléfono (si existe)
        if search_phone:
            # Filtro por teléfono que contenga la cadena de búsqueda (LIKE)
            query = query.filter(Client.phone.ilike(f'%{search_phone}%'))
            
        clients = query.order_by(Client.full_name).limit(50).all() # Limitar resultados

        return {"clients": [c.to_dict() for c in clients]}, 200

class ClientResource(Resource):
    
    @jwt_required()
    def _check_client_ownership(self, client_id):
        """Verifica si el usuario puede ver o modificar este cliente."""
        claims = get_jwt()
        client = Client.query.get(client_id)
        
        if not client:
            return None, 404
        
        if claims.get('is_super_admin'):
            return client, 200 # Super Admin tiene acceso total

        # Para Admins/Empleados, verificar si el cliente está asociado a alguna rama de su negocio
        user_business_id = claims.get('business_id')
        if not user_business_id:
             return None, 403 # Usuario sin negocio asociado
        
        # Buscar la sucursal del cliente y ver si pertenece al negocio del usuario
        if client.branch and client.branch.business_id == user_business_id:
            return client, 200
        
        # Si el cliente no tiene branch_id O su branch no coincide con el negocio, denegar acceso.
        return None, 403

    @jwt_required()
    def get(self, client_id):
        client, status = self._check_client_ownership(client_id)
        if status != 200:
            return {"message": "Cliente no encontrado o no autorizado"}, status
        
        return client.to_dict(), 200

    @jwt_required()
    def put(self, client_id):
        client, status = self._check_client_ownership(client_id)
        if status != 200:
            return {"message": "No autorizado para modificar este cliente"}, status
            
        args = client_update_parser.parse_args()

        # Actualizar solo si el campo está presente en la solicitud
        if args['full_name']:
            client.full_name = args['full_name'].title()
        if args['email']:
            client.email = args['email']
        if args['notes'] is not None: # Permitir que se vacíe la nota
            client.notes = args['notes']
        
        # Si se intenta cambiar el teléfono, verificar unicidad
        if args['phone'] and args['phone'] != client.phone:
            if Client.query.filter(Client.phone == args['phone'], Client.id != client_id).first():
                return {"message": f"El teléfono {args['phone']} ya está registrado por otro cliente."}, 409
            client.phone = args['phone']

        try:
            db.session.commit()
            return {"message": "Cliente actualizado exitosamente", "client": client.to_dict()}, 200
        except Exception as e:
            db.session.rollback()
            return {"message": "Error al actualizar cliente", "error": str(e)}, 500

    @jwt_required()
    def delete(self, client_id):
        # 🔑 NOTA: Por ahora, solo Super Admin debería poder borrar clientes 
        # para evitar problemas de integridad si ya tiene órdenes.
        claims = get_jwt()
        if not claims.get('is_super_admin'):
             return {"message": "Permiso denegado. Solo Super Admin puede eliminar clientes."}, 403

        client = Client.query.get(client_id)
        if not client:
            return {"message": "Cliente no encontrado"}, 404

        try:
            db.session.delete(client)
            db.session.commit()
            return {"message": "Cliente eliminado exitosamente"}, 200
        except Exception as e:
            db.session.rollback()
            return {"message": "Error al eliminar cliente", "error": str(e)}, 500
# --- FIN RECURSOS CLIENTES ---


# Endpoint protegido para pruebas
class ProtectedResource(Resource):
    @jwt_required()
    def get(self):
        return {"message": "Este es un endpoint protegido. ¡Tienes acceso!"}, 200


# --- CONFIGURACIÓN DE RUTAS ---
api.add_resource(AdminRegistration, '/register_admin')
api.add_resource(BusinessCreation, '/register_business')
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

# Rutas para Sucursales (NUEVAS)
api.add_resource(BranchResource, '/businesses/<int:business_id>/branches') 
api.add_resource(BranchDetailResource, '/branches/<int:branch_id>')

# --- RUTAS DE CLIENTES ---
api.add_resource(ClientListResource, '/api/v1/clients') # GET (listar/buscar), POST (crear)
api.add_resource(ClientResource, '/api/v1/clients/<int:client_id>') # GET, PUT, DELETE


if __name__ == '__main__':
    with app.app_context():
        # db.create_all() # No usamos create_all si estamos usando Flask-Migrate
        pass
    app.run(debug=True)