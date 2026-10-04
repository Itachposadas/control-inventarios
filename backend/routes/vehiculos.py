# backend/routes/vehiculos.py
from flask import Blueprint, request, jsonify
from auth_utils import role_required
from extensions import db
from sqlalchemy import func
from models import Vehiculo, Solicitud

vehiculos_bp = Blueprint("vehiculos", __name__, url_prefix="/api/vehiculos")

ESTADOS = ("activo", "mantenimiento", "baja")


# ─── Rutas específicas PRIMERO (importante el orden) ───
@vehiculos_bp.route("/areas", methods=["GET"])
@role_required()
def list_areas():
    """Devuelve todas las áreas únicas para llenar el <select>."""
    rows = db.session.query(Vehiculo.area).distinct().order_by(Vehiculo.area).all()
    return jsonify([r[0] for r in rows if r[0]]), 200


# ─── Listado general ───
@vehiculos_bp.route("", methods=["GET"])
@vehiculos_bp.route("/", methods=["GET"])
@role_required()
def list_vehiculos():
    q = (request.args.get("q") or "").strip()
    area = (request.args.get("area") or "").strip()
    estado = (request.args.get("estado") or "").strip()

    query = Vehiculo.query

    if area:
        query = query.filter(Vehiculo.area == area)
    if estado:
        query = query.filter(Vehiculo.estado == estado)
    if q:
        like = f"%{q}%"
        query = query.filter(
            db.or_(
                Vehiculo.no_inventario.like(like),
                Vehiculo.numero_economico.like(like),
                Vehiculo.placas.like(like),
                Vehiculo.marca.like(like),
                Vehiculo.unidad.like(like),
                Vehiculo.descripcion.like(like),
                Vehiculo.serie.like(like),
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
@role_required()
def get_vehiculo(vehiculo_id):
    v = db.session.get(Vehiculo, vehiculo_id)
    if not v:
        return jsonify({"msg": "Vehículo no encontrado"}), 404
    return jsonify(v.to_dict()), 200


# ─── Historial por ID ───
@vehiculos_bp.route("/<int:vehiculo_id>/historial", methods=["GET"])
@role_required()
def get_historial(vehiculo_id):
    """Solicitudes del vehículo en el formato que usa HistorialTimeline."""
    v = db.session.get(Vehiculo, vehiculo_id)
    if not v:
        return jsonify({"msg": "Vehículo no encontrado"}), 404

    items = v.solicitudes.order_by(Solicitud.fecha_ingreso.desc()).all()
    return jsonify([
        {
            "id": s.id,
            "solicitudId": s.id,
            "folio": s.folio,
            "tipo": s.tipo.capitalize(),
            "estado": "Completado" if s.estado in ("completada", "entregada") else "En proceso",
            "descripcion": s.fallas or s.observaciones_ingreso or "Sin diagnóstico",
            "fecha": s.fecha_ingreso.isoformat(),
            "mecanico": (s.mecanico.nombre_completo or s.mecanico.username) if s.mecanico else "—",
            "costo": float(s.costo) if s.costo is not None else 0,
        }
        for s in items
    ]), 200


# ─── Crear vehículo ───
@vehiculos_bp.route("", methods=["POST"])
@vehiculos_bp.route("/", methods=["POST"])
@role_required("admin")
def crear_vehiculo():
    data = request.get_json() or {}

    no_inventario = (data.get("no_inventario") or "").strip()
    area = (data.get("area") or "").strip()

    if not no_inventario:
        return jsonify({"msg": "El No. de Inventario es obligatorio"}), 400
    if not area:
        return jsonify({"msg": "El Área es obligatoria"}), 400

    estado = data.get("estado") or "activo"
    if estado not in ESTADOS:
        return jsonify({"msg": "Estado inválido"}), 400

    # Verificar que no exista otro vehículo con el mismo No. Inventario
    if Vehiculo.query.filter(Vehiculo.no_inventario == no_inventario).first():
        return jsonify({"msg": "Ya existe un vehículo con ese No. de Inventario"}), 409

    vehiculo = Vehiculo(
        np=data.get("np") or None,
        no_inventario=no_inventario,
        area=area,
        unidad=(data.get("unidad") or "").strip() or None,
        descripcion=(data.get("descripcion") or "").strip() or None,
        modelo=(data.get("modelo") or "").strip() or None,
        marca=(data.get("marca") or "").strip() or None,
        serie=(data.get("serie") or "").strip() or None,
        no_motor=(data.get("no_motor") or "").strip() or None,
        placas=(data.get("placas") or "").strip() or None,
        numero_economico=(data.get("numero_economico") or "").strip() or None,
        color=(data.get("color") or "").strip() or None,
        estado=estado,
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
    campos_texto = [
        "unidad", "descripcion", "modelo", "marca",
        "serie", "no_motor", "placas", "numero_economico", "color",
    ]
    for campo in campos_texto:
        if campo in data:
            valor = (data[campo] or "").strip() or None
            setattr(v, campo, valor)

    # Área (obligatoria)
    if "area" in data:
        area = (data["area"] or "").strip()
        if not area:
            return jsonify({"msg": "El Área es obligatoria"}), 400
        v.area = area

    # No. Inventario (obligatorio y único)
    if "no_inventario" in data:
        nuevo = (data["no_inventario"] or "").strip()
        if not nuevo:
            return jsonify({"msg": "El No. de Inventario es obligatorio"}), 400
        if nuevo != v.no_inventario:
            if Vehiculo.query.filter(Vehiculo.no_inventario == nuevo).first():
                return jsonify({"msg": "Ya existe otro vehículo con ese No. de Inventario"}), 409
            v.no_inventario = nuevo

    # N.P. (numérico)
    if "np" in data:
        v.np = data["np"] or None

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