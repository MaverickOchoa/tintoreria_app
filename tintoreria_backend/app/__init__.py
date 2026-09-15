# tintoreria_backend/app/__init__.py

from flask import Flask
from .extensions import db, migrate, jwt, cors
from .config.config import Config


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Inicializar extensiones
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app)

    # Ruta de prueba
    @app.route("/")
    def health():
        return {"status": "ok", "message": "Backend Tintorería funcionando"}, 200

    return app
