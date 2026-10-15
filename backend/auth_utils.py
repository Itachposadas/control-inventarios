# backend/auth_utils.py
from functools import wraps
from flask import jsonify, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from extensions import db
from models import Usuario, ROLES, ROLES_TALLER


def get_current_user():
    """Devuelve el Usuario dueño del token actual (o None)."""
    user_id = get_jwt_identity()
    if user_id is None:
        return None
    return db.session.get(Usuario, int(user_id))


# Lo único que puede hacer una cuenta con contraseña temporal: cambiarla
PERMITIDO_SIN_CAMBIAR_PASSWORD = {"auth.me", "auth.renovar", "auth.cambiar_password"}


def role_required(*roles):
    """
    Exige un token válido, que el usuario exista y siga activo,
    y (si se indican roles) que tenga uno de ellos.

    Uso:
        @role_required()                     # personal del taller (admin o mecánico)
        @role_required("admin")              # solo admin
        @role_required("area")               # solo cuentas de área
        @role_required(*ROLES)               # cualquier cuenta activa
    """
    roles = roles or ROLES_TALLER
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user = get_current_user()
            if not user or not user.activo or user.role not in ROLES:
                # 401 → el frontend cierra la sesión
                return jsonify({"msg": "Sesión no válida"}), 401
            if user.role not in roles:
                return jsonify({"msg": "No tienes permiso para esta acción"}), 403
            if user.debe_cambiar_password and request.endpoint not in PERMITIDO_SIN_CAMBIAR_PASSWORD:
                return jsonify({
                    "msg": "Antes de continuar debes cambiar tu contraseña",
                    "codigo": "cambiar_password",
                }), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
