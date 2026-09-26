# tintoreria_backend/app/config/config.py

import os


class Config:
    # URL de la base de datos (usamos la que ya estabas usando)
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:YoYo158087@localhost/tintoreria_db",
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Clave JWT (puedes moverla a variable de entorno después)
    JWT_SECRET_KEY = os.getenv(
        "JWT_SECRET_KEY",
        "una-clave-super-secreta-y-larga",
    )
