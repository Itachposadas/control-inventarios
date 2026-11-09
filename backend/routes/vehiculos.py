# backend/routes/vehiculos.py
from flask import Blueprint, request, jsonify
from auth_utils import role_required
from extensions import db
from sqlalchemy import func
from models import Vehiculo, Solicitud
from validacion import texto

vehiculos_bp = Blueprint("vehiculos", __name__, url_prefix="/api/vehiculos")

ESTADOS = ("activo", "mantenimiento", "baja")

CAMPOS_TEXTO = [
    "unidad", "descripcion", "modelo", "marca",
    "serie", "no_motor", "placas", "numero_economico", "color",
]


def _np(valor):
    """N.P. (número progresivo): entero positivo o vacío. Devuelve (np, error)."""
    if valor in (None, ""):
        return None, None
    try:
        np = int(valor)
    except (TypeError, ValueError):
        return None, "El N.P. debe ser un número entero"
    if not 1 <= np <= 999999:
        return None, "El N.P. debe estar entre 1 y 999999"
    return np, None


# ─── Rutas específicas PRIMERO (importante el orden) ───
@vehiculos_bp.route("/areas", methods=["GET"])
@role_required("admin")
def list_areas():
    """Devuelve todas las áreas únicas para llenar el <select>."""
    rows = db.session.query(Vehiculo.area).distinct().order_by(Vehiculo.area).all()
    return jsonify([r[0] for r in rows if r[0]]), 200


# ─── Listado general ───
@vehiculos_bp.route("", methods=["GET"])
@vehiculos_bp.route("/", methods=["GET"])
@role_required("admin")
def list_vehiculos():
    q = (request.args.get("q") or "").strip()
    area = (request.args.get("area") or "").strip()
    estado = (request.args.get("estado") or "").strip()

    query = Vehiculo.query

    if area:
        query = query.filter(Vehiculo.area == area)
    if estado:
        query = query.filter(Vehiculo.estado == estado)
    # Cada palabra debe aparecer en algún dato: "bomberos ford" → unidades Ford de Bomberos
    for palabra in q.split():
        like = f"%{palabra}%"
        query = query.filter(
            db.or_(
                Vehiculo.no_inventario.like(like),
                Vehiculo.numero_economico.like(like),
                Vehiculo.placas.like(like),
                Vehiculo.marca.like(like),
                Vehiculo.unidad.like(like),
                Vehiculo.descripcion.like(like),
                Vehiculo.serie.like(like),
                Vehiculo.area.like(like),
                Vehiculo.modelo.like(like),
                Vehiculo.color.like(like),
            )
        )

    items = query.order_by(Vehiculo.np.asc()).all()

    # Número de servicios (solicitudes) por vehículo, en una sola consulta
    conteo = dict(
        db.session.query(Solicitud.vehiculo_id, func.count(Solicitud.id))
        .group_by(Solicitud.vehiculo_id)
        .all()
    )
    return jsonify([
        {**v.to_dict(), "servicios": conteo.get(v.id, 0)} for v in items
    ]), 200


# ─── Detalle por ID ───
@vehiculos_bp.route("/<int:vehiculo_id>", methods=["GET"])
@role_required("admin")
def get_vehiculo(vehiculo_id):
    v = db.session.get(Vehiculo, vehiculo_id)
    if not v:
        return jsonify({"msg": "Vehículo no encontrado"}), 404
    return jsonify(v.to_dict()), 200


# ─── Crear vehículo ───
@vehiculos_bp.route("", methods=["POST"])
@vehiculos_bp.route("/", methods=["POST"])
@role_required("admin")
def crear_vehiculo():
    data = request.get_json() or {}

    no_inventario = texto(data.get("no_inventario"))
    area = texto(data.get("area"))

    if not no_inventario:
        return jsonify({"msg": "El No. de Inventario es obligatorio"}), 400
    if not area:
        return jsonify({"msg": "El Área es obligatoria"}), 400

    estado = data.get("estado") or "activo"
    if estado not in ESTADOS:
        return jsonify({"msg": "Estado inválido"}), 400
    np, error = _np(data.get("np"))
    if error:
        return jsonify({"msg": error}), 400

    # Verificar que no exista otro vehículo con el mismo No. Inventario
    if Vehiculo.query.filter(Vehiculo.no_inventario == no_inventario).first():
        return jsonify({"msg": "Ya existe un vehículo con ese No. de Inventario"}), 409

    vehiculo = Vehiculo(
        np=np,
        no_inventario=no_inventario,
        area=area,
        estado=estado,
        **{campo: texto(data.get(campo)) for campo in CAMPOS_TEXTO},
    )

    db.session.add(vehiculo)
    db.session.commit()

    return jsonify(vehiculo.to_dict()), 201


# ─── Editar vehículo ───
@vehiculos_bp.route("/<int:vehiculo_id>", methods=["PUT"])
@role_required("admin")
def editar_vehiculo(vehiculo_id):
    v = db.session.get(Vehiculo, vehiculo_id)
    if not v:
        return jsonify({"msg": "Vehículo no encontrado"}), 404

    data = request.get_json() or {}

    # Campos de texto
    for campo in CAMPOS_TEXTO:
        if campo in data:
            setattr(v, campo, texto(data[campo]))

    # Área (obligatoria)
    if "area" in data:
        area = texto(data["area"])
        if not area:
            return jsonify({"msg": "El Área es obligatoria"}), 400
        v.area = area

    # No. Inventario (obligatorio y único)
    if "no_inventario" in data:
        nuevo = texto(data["no_inventario"])
        if not nuevo:
            return jsonify({"msg": "El No. de Inventario es obligatorio"}), 400
        if nuevo != v.no_inventario:
            if Vehiculo.query.filter(Vehiculo.no_inventario == nuevo).first():
                return jsonify({"msg": "Ya existe otro vehículo con ese No. de Inventario"}), 409
            v.no_inventario = nuevo

    # N.P. (numérico)
    if "np" in data:
        np, error = _np(data["np"])
        if error:
            return jsonify({"msg": error}), 400
        v.np = np

    # Estado
    if "estado" in data:
        if data["estado"] not in ESTADOS:
            return jsonify({"msg": "Estado inválido"}), 400
        v.estado = data["estado"]

    db.session.commit()
    return jsonify(v.to_dict()), 200


# ─── Eliminar vehículo ───
@vehiculos_bp.route("/<int:vehiculo_id>", methods=["DELETE"])
@role_required("admin")
def eliminar_vehiculo(vehiculo_id):
    v = db.session.get(Vehiculo, vehiculo_id)
    if not v:
        return jsonify({"msg": "Vehículo no encontrado"}), 404

    if v.solicitudes.first():
        return jsonify({
            "msg": "No se puede eliminar: el vehículo tiene historial de servicios. "
                   "Cámbialo a estado \"Baja\" en su lugar."
        }), 409

    db.session.delete(v)
    db.session.commit()
    return jsonify({"msg": "Vehículo eliminado"}), 200