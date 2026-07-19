from flask import Flask
from flask_cors import CORS

from app.extensions import db, migrate, jwt

from app.routes.auth_routes import auth_bp
from app.routes.business_routes import business_bp
from app.routes.branch_routes import branch_bp
from app.routes.service_routes import service_bp
from app.routes.category_routes import category_bp
from app.routes.item_routes import item_bp


def create_app():
    flask_app = Flask(__name__)
    flask_app.config.from_object("app.config.Config")

    db.init_app(flask_app)
    migrate.init_app(flask_app, db)
    jwt.init_app(flask_app)

    CORS(
        flask_app,
        resources={r"/api/*": {"origins": ["http://localhost:5173"]}},
        supports_credentials=True,
    )

    flask_app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    flask_app.register_blueprint(business_bp, url_prefix="/api/v1/businesses")
    flask_app.register_blueprint(branch_bp, url_prefix="/api/v1/branches")
    flask_app.register_blueprint(service_bp, url_prefix="/api/v1/services")
    flask_app.register_blueprint(category_bp, url_prefix="/api/v1/categories")
    flask_app.register_blueprint(item_bp, url_prefix="/api/v1/items")

    # ✅ users
    try:
        from app.routes.user_routes import user_bp
        flask_app.register_blueprint(user_bp, url_prefix="/api/v1/users")
    except Exception:
        pass

    # ✅ OPTIONAL: branch item overrides
    try:
        from app.routes.branch_item_override_routes import branch_item_override_bp
        flask_app.register_blueprint(
            branch_item_override_bp, url_prefix="/api/v1/branch-item-overrides"
        )
    except Exception:
        pass

    @flask_app.get("/ping")
    def ping():
        return {"message": "pong"}, 200

    # CLI optional
    try:
        from app.cli import register_cli
        register_cli(flask_app)
    except Exception:
        pass

    return flask_app
