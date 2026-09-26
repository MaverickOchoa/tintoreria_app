# app/routes/auth_routes.py

from flask import Blueprint, jsonify

auth_bp = Blueprint("auth", __name__)


@auth_bp.get("/health")
def health_check():
    return jsonify({"status": "ok"}), 200
