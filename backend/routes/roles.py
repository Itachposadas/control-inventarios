# backend/routes/roles.py
from flask import Blueprint, request, jsonify
from auth_utils import role_required
from extensions import db
from models import Rol, ROLES

roles_bp = Blueprint("roles", __name__, url_prefix="/api/roles")

# Nombres de los roles base; no se permite crear otro rol con el mismo nombre
NOMBRES_RESERVADOS = {"administrador", "admin", "mecánico", "mecanico"}


# ─── Listar roles personalizados ───
@roles_bp.route("", methods=["GET"])
@roles_bp.route("/", methods=["GET"])
@role_required("admin")
def listar_roles():
    items = Rol.query.order_by(Rol.nombre).all()
    return jsonify([r.to_dict() for r in items]), 200


# ─── Crear rol ───
@roles_bp.route("", methods=["POST"])
@roles_bp.route("/", methods=["POST"])
@role_required("admin")
def crear_rol():
    data = request.get_json() or {}
    nombre = " ".join((data.get("nombre") or "").split())
    base = data.get("base")

    if not nombre:
        return jsonify({"msg": "El nombre del rol es obligatorio"}), 400
    if len(nombre) > 60:
        return jsonify({"msg": "El nombre del rol es demasiado largo (máximo 60)"}), 400
    if base not in ROLES:
        return jsonify({"msg": "Elige los permisos del rol"}), 400
    if nombre.lower() in NOMBRES_RESERVADOS or Rol.query.filter(
        db.func.lower(Rol.nombre) == nombre.lower()
    ).first():
        return jsonify({"msg": "Ya existe un rol con ese nombre"}), 409

    rol = Rol(nombre=nombre, base=base)
    db.session.add(rol)
    db.session.commit()
    return jsonify(rol.to_dict()), 201
