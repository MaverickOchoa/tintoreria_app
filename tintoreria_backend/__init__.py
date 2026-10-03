# tintoreria_backend/__init__.py

"""
Paquete raíz del backend de Tintorería.

Solo expone create_app para que otras herramientas (por ejemplo tests)
puedan importar la aplicación fácilmente.
"""

from .app import create_app

__all__ = ["create_app"]
