# backend/routes/auth.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from extensions import db
from models import Usuario, utcnow, ROLES
from auth_utils import role_required, get_current_user
from seguridad import error_password, MAX_INTENTOS, TIEMPO_BLOQUEO

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# Nota: ya no existe /register público. Las cuentas nuevas las crea
# un administrador desde POST /api/usuarios.


def _minutos_restantes(user):
    segundos = (user.bloqueado_hasta - utcnow()).total_seconds()
    return max(1, int(segundos // 60) + (1 if segundos % 60 else 0))


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

    # Cuenta bloqueada por intentos fallidos: ni se revisa la contraseña
    if user and user.bloqueada():
        minutos = _minutos_restantes(user)
        return jsonify({
            "msg": f"Cuenta bloqueada por varios intentos fallidos. Intenta de nuevo en {minutos} "
                   f"{'minuto' if minutos == 1 else 'minutos'} o pide al administrador que la desbloquee."
        }), 429

    if not user or not user.check_password(password):
        if user:
            user.intentos_fallidos = (user.intentos_fallidos or 0) + 1
            if user.intentos_fallidos >= MAX_INTENTOS:
                user.bloqueado_hasta = utcnow() + TIEMPO_BLOQUEO
                user.intentos_fallidos = 0
                db.session.commit()
                minutos = int(TIEMPO_BLOQUEO.total_seconds() // 60)
                return jsonify({
                    "msg": f"Demasiados intentos fallidos. La cuenta quedó bloqueada {minutos} minutos."
                }), 429
            db.session.commit()
            restantes = MAX_INTENTOS - user.intentos_fallidos
            if restantes <= 2:
                return jsonify({
                    "msg": f"Credenciales inválidas. Te quedan {restantes} "
                           f"{'intento' if restantes == 1 else 'intentos'} antes de que se bloquee la cuenta."
                }), 401
        return jsonify({"msg": "Credenciales inválidas"}), 401

    if not user.activo:
        return jsonify({"msg": "Cuenta desactivada"}), 403

    if user.role not in ROLES:
        return jsonify({"msg": "Tu rol ya no tiene acceso al sistema"}), 403

    if user.role == "area" and not user.area:
        return jsonify({"msg": "Tu cuenta no tiene un área asignada. Avisa al administrador."}), 403

    user.intentos_fallidos = 0
    user.bloqueado_hasta = None
    # Contraseñas anteriores a las reglas actuales (ej. 123456): se pide cambiarla
    if error_password(password, user.username):
        user.debe_cambiar_password = True
    user.ultimo_acceso = utcnow()
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": token, "user": user.to_dict()}), 200


@auth_bp.route("/me", methods=["GET"])
@role_required(*ROLES)
def me():
    return jsonify(get_current_user().to_dict()), 200


# ─── Renovar la sesión (el frontend la pide mientras el usuario sigue trabajando) ───
@auth_bp.route("/renovar", methods=["POST"])
@role_required(*ROLES)
def renovar():
    user = get_current_user()
    return jsonify({"access_token": create_access_token(identity=str(user.id))}), 200


# ─── Cambiar mi propia contraseña ───
@auth_bp.route("/password", methods=["PUT"])
@role_required(*ROLES)
def cambiar_password():
    user = get_current_user()
    data = request.get_json() or {}
    actual = data.get("actual") or ""
    nueva = data.get("nueva") or ""

    if not user.check_password(actual):
        return jsonify({"msg": "La contraseña actual no es correcta"}), 400
    error = error_password(nueva, user.username)
    if error:
        return jsonify({"msg": error}), 400
    if nueva == actual:
        return jsonify({"msg": "La nueva contraseña debe ser distinta a la actual"}), 400

    user.set_password(nueva)
    user.debe_cambiar_password = False
    db.session.commit()
    return jsonify({"msg": "Contraseña actualizada", "user": user.to_dict()}), 200
