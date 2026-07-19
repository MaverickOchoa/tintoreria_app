# backend_new/app/config/__init__.py

import os


class Config:
    """
    Config base para Flask.
    Esta clase debe existir aquí porque create_app carga:
    flask_app.config.from_object("app.config.Config")
    """

    # Flask
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me")

    # JWT
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)

    # SQLAlchemy
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "sqlite:///dev.db",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # CORS (si tu app/__init__.py lo usa)
    # Ej: CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

    # Opcional: evitar que flask json ordene keys
    JSON_SORT_KEYS = False
