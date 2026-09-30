# backend/routes/usuarios.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from auth_utils import role_required
from extensions import db
from models import Usuario, Solicitud, SolicitudEvento, ROLES

usuarios_bp = Blueprint("usuarios", __name__, url_prefix="/api/usuarios")


# ─── Listar usuarios ───
@usuarios_bp.route("", methods=["GET"])
@usuarios_bp.route("/", methods=["GET"])
@role_required("admin")
def listar_usuarios():
    q = (request.args.get("q") or "").strip()
    role = (request.args.get("role") or "").strip()
    activo = request.args.get("activo")

    query = Usuario.query

    if role:
        query = query.filter(Usuario.role == role)
    if activo is not None and activo != "":
        query = query.filter(Usuario.activo == (activo == "true"))
    if q:
        like = f"%{q}%"
        query = query.filter(
            db.or_(
                Usuario.username.like(like),
                Usuario.email.like(like),
                Usuario.nombre_completo.like(like),
            )
        )

    items = query.order_by(Usuario.created_at.desc()).all()
    return jsonify([u.to_dict() for u in items]), 200


# ─── Obtener un usuario ───
@usuarios_bp.route("/<int:user_id>", methods=["GET"])
@role_required("admin")
def obtener_usuario(user_id):
    user = db.session.get(Usuario, user_id)
    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404
    return jsonify(user.to_dict()), 200


# ─── Crear usuario ───
@usuarios_bp.route("", methods=["POST"])
@usuarios_bp.route("/", methods=["POST"])
@role_required("admin")
def crear_usuario():
    data = request.get_json() or {}

    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = data.get("role", "mecanico")
    nombre_completo = (data.get("nombre_completo") or "").strip()

    # Validaciones
    if not username or not email or not password:
        return jsonify({"msg": "Usuario, email y contraseña son obligatorios"}), 400
    if len(password) < 6:
        return jsonify({"msg": "La contraseña debe tener al menos 6 caracteres"}), 400
    if role not in ROLES:
        return jsonify({"msg": "Rol inválido"}), 400

    # Duplicados
    if Usuario.query.filter(
        (Usuario.username == username) | (Usuario.email == email)
    ).first():
        return jsonify({"msg": "Usuario o email ya registrado"}), 409

    user = Usuario(
        username=username,
        email=email,
        role=role,
        nombre_completo=nombre_completo or None,
        activo=True,
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify(user.to_dict()), 201


# ─── Editar usuario ───
@usuarios_bp.route("/<int:user_id>", methods=["PUT"])
@role_required("admin")
def editar_usuario(user_id):
    user = db.session.get(Usuario, user_id)
    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404

    data = request.get_json() or {}

    # No permitir que se cambie el username si ya existe en otro user
    if "username" in data:
        nuevo = (data["username"] or "").strip()
        if nuevo and nuevo != user.username:
            if Usuario.query.filter(Usuario.username == nuevo).first():
                return jsonify({"msg": "Ese nombre de usuario ya existe"}), 409
            user.username = nuevo

    if "email" in data:
        nuevo = (data["email"] or "").strip().lower()
        if nuevo and nuevo != user.email:
            if Usuario.query.filter(Usuario.email == nuevo).first():
                return jsonify({"msg": "Ese email ya existe"}), 409
            user.email = nuevo

    if "nombre_completo" in data:
        user.nombre_completo = (data["nombre_completo"] or "").strip() or None

    es_uno_mismo = user.id == int(get_jwt_identity())

    if "role" in data:
        if data["role"] not in ROLES:
            return jsonify({"msg": "Rol inválido"}), 400
        # Evita que el admin se quite su propio rol y pierda el acceso
        if es_uno_mismo and data["role"] != "admin":
            return jsonify({"msg": "No puedes quitarte el rol de administrador"}), 400
        user.role = data["role"]

    if "activo" in data:
        if es_uno_mismo and not data["activo"]:
            return jsonify({"msg": "No puedes desactivar tu propia cuenta"}), 400
        user.activo = bool(data["activo"])

    # Cambiar contraseña (opcional)
    if data.get("password"):
        if len(data["password"]) < 6:
            return jsonify({"msg": "La contraseña debe tener al menos 6 caracteres"}), 400
        user.set_password(data["password"])

    db.session.commit()
    return jsonify(user.to_dict()), 200


# ─── Eliminar usuario ───
@usuarios_bp.route("/<int:user_id>", methods=["DELETE"])
@role_required("admin")
def eliminar_usuario(user_id):
    current_id = int(get_jwt_identity())

    # No permitir que un admin se elimine a sí mismo
    if user_id == current_id:
        return jsonify({"msg": "No puedes eliminar tu propio usuario"}), 400

    user = db.session.get(Usuario, user_id)
    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404

    # Si ya participó en solicitudes, borrarlo rompería el historial
    tiene_historial = (
        Solicitud.query.filter(
            (Solicitud.mecanico_id == user.id) | (Solicitud.creado_por_id == user.id)
        ).first()
        or SolicitudEvento.query.filter_by(usuario_id=user.id).first()
    )
    if tiene_historial:
        return jsonify({
            "msg": "No se puede eliminar: el usuario tiene solicitudes registradas. "
                   "Desactívalo en su lugar."
        }), 409

    db.session.delete(user)
    db.session.commit()
    return jsonify({"msg": "Usuario eliminado"}), 200