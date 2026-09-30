# backend/routes/auth.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from extensions import db
from models import Usuario, utcnow, ROLES
from auth_utils import role_required, get_current_user

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# Nota: ya no existe /register público. Las cuentas nuevas las crea
# un administrador desde POST /api/usuarios.


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    identifier = (data.get("identifier") or "").strip()
    password = data.get("password") or ""

    if not identifier or not password:
        return jsonify({"msg": "Credenciales incompletas"}), 400

    user = Usuario.query.filter(
        (Usuario.username == identifier) | (Usuario.email == identifier.lower())
    ).first()

    if not user or not user.check_password(password):
        return jsonify({"msg": "Credenciales inválidas"}), 401

    if not user.activo:
        return jsonify({"msg": "Cuenta desactivada"}), 403

    if user.role not in ROLES:
        return jsonify({"msg": "Tu rol ya no tiene acceso al sistema"}), 403

    user.ultimo_acceso = utcnow()
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": token, "user": user.to_dict()}), 200


@auth_bp.route("/me", methods=["GET"])
@role_required()
def me():
    return jsonify(get_current_user().to_dict()), 200
