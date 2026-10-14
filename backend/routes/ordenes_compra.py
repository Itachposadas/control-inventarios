# backend/routes/ordenes_compra.py
# Órdenes de compra: las manda el mecánico desde su servicio (paso "compra",
# POST /api/solicitudes/<id>/orden-compra) y administración las atiende:
# captura proveedor, precios unitarios e IVA. La firma de quien autoriza
# (coordinador de parque vehicular) la pone parque vehicular al enviarla.
# Al atenderla, el servicio pasa a Reparación y su costo es el total de la orden.
from flask import Blueprint, request, jsonify
from extensions import db
from models import OrdenCompra, Solicitud, ESTADOS_ORDEN_COMPRA, utcnow
from auth_utils import role_required, get_current_user
from routes.solicitudes import _registrar, _avanzar, _texto
from routes.peticiones import _numero

ordenes_compra_bp = Blueprint("ordenes_compra", __name__, url_prefix="/api/ordenes-compra")


@ordenes_compra_bp.route("", methods=["GET"])
@ordenes_compra_bp.route("/", methods=["GET"])
@role_required("admin", "mecanico")
def listar():
    """Admin: todas. Mecánico: las de sus servicios. ?estado=enviada|atendida|todas"""
    user = get_current_user()
    estado = (request.args.get("estado") or "enviada").strip()
    query = OrdenCompra.query.join(Solicitud)
    if user.role == "mecanico":
        query = query.filter(Solicitud.mecanico_id == user.id)
    if estado != "todas":
        if estado not in ESTADOS_ORDEN_COMPRA:
            return jsonify({"msg": "Estado inválido"}), 400
        query = query.filter(OrdenCompra.estado == estado)
    # Por atender: la más antigua primero (lleva más tiempo esperando)
    orden = OrdenCompra.created_at.asc() if estado == "enviada" else OrdenCompra.created_at.desc()
    items = query.order_by(orden, OrdenCompra.id.asc()).limit(200).all()
    return jsonify([o.to_dict() for o in items]), 200


@ordenes_compra_bp.route("/ultima-autorizacion", methods=["GET"])
@role_required("admin", "mecanico")
def ultima_autorizacion():
    """Nombre y firma de la última orden atendida: se proponen en la siguiente."""
    o = (
        OrdenCompra.query.filter(OrdenCompra.autoriza_firma.isnot(None))
        .order_by(OrdenCompra.atendida_at.desc(), OrdenCompra.id.desc())
        .first()
    )
    return jsonify({"nombre": o.autoriza_nombre, "firma": o.autoriza_firma} if o else None), 200


@ordenes_compra_bp.route("/<int:orden_id>", methods=["GET"])
@role_required("admin", "mecanico")
def obtener(orden_id):
    user = get_current_user()
    o = db.session.get(OrdenCompra, orden_id)
    if not o or (user.role == "mecanico" and o.solicitud.mecanico_id != user.id):
        return jsonify({"msg": "Orden de compra no encontrada"}), 404
    return jsonify(o.to_dict()), 200


def _aplicar(o, data):
    """Datos que captura administración. Devuelve un mensaje de error o None."""
    proveedor = data.get("proveedor")
    if isinstance(proveedor, dict):
        o.proveedor_nombre = _texto(proveedor.get("nombre"))
        o.proveedor_direccion = _texto(proveedor.get("direccion"))
        o.proveedor_telefono = _texto(proveedor.get("telefono"))
        if o.proveedor_nombre and len(o.proveedor_nombre) > 200:
            return "El nombre del proveedor es demasiado largo"

    if "iva_porcentaje" in data:
        iva = _numero(data["iva_porcentaje"])
        if iva is None or not 0 <= iva <= 100:
            return "El IVA debe ser un porcentaje entre 0 y 100"
        o.iva_porcentaje = round(iva, 2)

    if "adicionales" in data:
        o.adicionales = _texto(data["adicionales"])

    precios = data.get("precios")
    if precios is not None:
        if not isinstance(precios, dict):
            return "Precios inválidos"
        piezas = {str(p.id): p for p in o.solicitud.piezas}
        for clave, valor in precios.items():
            pieza = piezas.get(str(clave))
            if not pieza:
                return "Esa refacción no es de esta orden"
            if valor in ("", None):
                pieza.precio_unitario = None
                continue
            precio = _numero(valor)
            if precio is None or not 0 <= precio <= 9999999:
                return f"Precio inválido para «{pieza.concepto}»"
            pieza.precio_unitario = round(precio, 2)
    return None


def _orden_por_atender(orden_id):
    o = db.session.get(OrdenCompra, orden_id)
    if not o:
        return None, (jsonify({"msg": "Orden de compra no encontrada"}), 404)
    if o.estado != "enviada":
        return None, (jsonify({"msg": "Esta orden de compra ya fue atendida"}), 409)
    return o, None


@ordenes_compra_bp.route("/<int:orden_id>", methods=["PUT"])
@role_required("admin")
def guardar(orden_id):
    """Guarda lo capturado sin atenderla todavía."""
    o, error = _orden_por_atender(orden_id)
    if error:
        return error
    mensaje = _aplicar(o, request.get_json() or {})
    if mensaje:
        db.session.rollback()
        return jsonify({"msg": mensaje}), 400
    db.session.commit()
    return jsonify(o.to_dict()), 200


@ordenes_compra_bp.route("/<int:orden_id>/atender", methods=["POST"])
@role_required("admin")
def atender(orden_id):
    """Guarda lo capturado y la atiende: el servicio sigue a Reparación."""
    user = get_current_user()
    o, error = _orden_por_atender(orden_id)
    if error:
        return error
    mensaje = _aplicar(o, request.get_json() or {})
    if mensaje:
        db.session.rollback()
        return jsonify({"msg": mensaje}), 400
    if not o.proveedor_nombre:
        db.session.rollback()
        return jsonify({"msg": "Escribe el nombre o razón social del proveedor"}), 400
    sin_precio = [p.concepto for p in o.solicitud.piezas if p.precio_unitario is None]
    if sin_precio:
        db.session.rollback()
        return jsonify({"msg": f"Falta el precio unitario de «{sin_precio[0]}»"}), 400

    o.estado = "atendida"
    o.atendida_por_id = user.id
    o.atendida_at = utcnow()
    s = o.solicitud
    s.costo = o.totales()[3]  # el costo del servicio es el total de la orden
    _registrar(s, user, f"Administración atendió la orden de compra {o.folio}")
    if s.estado == "compra":
        _avanzar(s, user, "reparacion")
    db.session.commit()
    return jsonify(o.to_dict()), 200
