# backend/routes/foraneas.py
# Orden de reparación en taller foráneo (se genera desde un ingreso a taller).
from datetime import datetime
from flask import Blueprint, request, jsonify
from extensions import db
from models import OrdenForanea, Solicitud, Vehiculo, utcnow
from auth_utils import role_required, get_current_user
from routes.solicitudes import EN_TALLER, _registrar, _texto, UTC_OFFSET

foraneas_bp = Blueprint("foraneas", __name__, url_prefix="/api")

TALLERES = ("muelles", "llantas", "transmision")


def _puede_ver(user, orden):
    return user.role == "admin" or orden.solicitud.mecanico_id == user.id


def _puede_editar(user, solicitud):
    # Solo el mecánico asignado y mientras la unidad siga en el taller
    return (
        user.role == "mecanico"
        and solicitud.mecanico_id == user.id
        and solicitud.estado in EN_TALLER
    )


def _aplicar(orden, data, solicitud):
    """Valida y copia los campos. Devuelve un mensaje de error o None."""
    if "fecha_remision" in data or orden.fecha_remision is None:
        texto = data.get("fecha_remision")
        hoy = (utcnow() - UTC_OFFSET).date()
        if not texto:
            fecha = hoy
        else:
            try:
                fecha = datetime.strptime(str(texto)[:10], "%Y-%m-%d").date()
            except ValueError:
                return "Fecha de remisión inválida"
        if fecha > hoy:
            return "La fecha de remisión no puede ser futura"
        ingreso = (solicitud.fecha_ingreso - UTC_OFFSET).date()
        if fecha < ingreso:
            return "La fecha de remisión no puede ser anterior al ingreso a taller"
        orden.fecha_remision = fecha

    if "diagnostico_inicial" in data:
        orden.diagnostico_inicial = _texto(data["diagnostico_inicial"])
    if not orden.diagnostico_inicial:
        return "Escribe el diagnóstico inicial"

    talleres = data.get("talleres")
    if isinstance(talleres, dict):
        for t in TALLERES:
            if t in talleres:
                valor = _texto(talleres[t])
                setattr(orden, f"taller_{t}", valor[:150] if valor else None)
    if not any(getattr(orden, f"taller_{t}") for t in TALLERES):
        return "Escribe al menos un taller (muelles, llantas o transmisión)"
    return None


# ─── Listar ───
@foraneas_bp.route("/foraneas", methods=["GET"])
@role_required()
def listar():
    user = get_current_user()
    q = (request.args.get("q") or "").strip()
    solicitud_id = request.args.get("solicitud_id", type=int)

    query = OrdenForanea.query.join(Solicitud).join(Vehiculo)
    if user.role != "admin":
        query = query.filter(Solicitud.mecanico_id == user.id)
    if solicitud_id:
        query = query.filter(OrdenForanea.solicitud_id == solicitud_id)
    if q:
        like = f"%{q}%"
        query = query.filter(db.or_(
            OrdenForanea.folio.like(like),
            Solicitud.folio.like(like),
            Vehiculo.no_inventario.like(like),
            Vehiculo.numero_economico.like(like),
            Vehiculo.placas.like(like),
            OrdenForanea.taller_muelles.like(like),
            OrdenForanea.taller_llantas.like(like),
            OrdenForanea.taller_transmision.like(like),
        ))
    items = query.order_by(OrdenForanea.fecha_remision.desc(), OrdenForanea.id.desc()).all()
    return jsonify([o.to_dict() for o in items]), 200


# ─── Detalle ───
@foraneas_bp.route("/foraneas/<int:orden_id>", methods=["GET"])
@role_required()
def obtener(orden_id):
    user = get_current_user()
    o = db.session.get(OrdenForanea, orden_id)
    if not o or not _puede_ver(user, o):
        return jsonify({"msg": "Orden no encontrada"}), 404
    return jsonify(o.to_dict()), 200


# ─── Crear a partir de un ingreso a taller ───
@foraneas_bp.route("/solicitudes/<int:solicitud_id>/foraneas", methods=["POST"])
@role_required("mecanico")
def crear(solicitud_id):
    user = get_current_user()
    s = db.session.get(Solicitud, solicitud_id)
    if not s:
        return jsonify({"msg": "Ingreso a taller no encontrado"}), 404
    if not _puede_editar(user, s):
        return jsonify({"msg": "Solo el mecánico asignado puede generarla mientras la unidad está en el taller"}), 403

    orden = OrdenForanea(solicitud_id=s.id, creado_por_id=user.id)
    error = _aplicar(orden, request.get_json() or {}, s)
    if error:
        return jsonify({"msg": error}), 400

    db.session.add(orden)
    db.session.flush()  # obtiene el id para el folio
    orden.folio = f"OTF-{orden.fecha_remision.year}-{orden.id:04d}"
    _registrar(s, user, f"Generó la orden de taller foráneo {orden.folio}")
    db.session.commit()
    return jsonify(orden.to_dict()), 201


# ─── Editar ───
@foraneas_bp.route("/foraneas/<int:orden_id>", methods=["PUT"])
@role_required("mecanico")
def editar(orden_id):
    user = get_current_user()
    o = db.session.get(OrdenForanea, orden_id)
    if not o or not _puede_ver(user, o):
        return jsonify({"msg": "Orden no encontrada"}), 404
    if not _puede_editar(user, o.solicitud):
        return jsonify({"msg": "Ya no puedes modificar esta orden"}), 403

    error = _aplicar(o, request.get_json() or {}, o.solicitud)
    if error:
        db.session.rollback()
        return jsonify({"msg": error}), 400
    _registrar(o.solicitud, user, f"Actualizó la orden de taller foráneo {o.folio}")
    db.session.commit()
    return jsonify(o.to_dict()), 200


# ─── Eliminar ───
@foraneas_bp.route("/foraneas/<int:orden_id>", methods=["DELETE"])
@role_required("mecanico")
def eliminar(orden_id):
    user = get_current_user()
    o = db.session.get(OrdenForanea, orden_id)
    if not o or not _puede_ver(user, o):
        return jsonify({"msg": "Orden no encontrada"}), 404
    if not _puede_editar(user, o.solicitud):
        return jsonify({"msg": "Ya no puedes eliminar esta orden"}), 403

    _registrar(o.solicitud, user, f"Eliminó la orden de taller foráneo {o.folio}")
    db.session.delete(o)
    db.session.commit()
    return jsonify({"msg": "Orden eliminada"}), 200
