# backend/routes/herramientas.py
# Préstamo de herramientas: catálogo del taller y préstamos a mecánicos.
from flask import Blueprint, request, jsonify
from sqlalchemy import func
from auth_utils import role_required, get_current_user
from extensions import db
from models import Herramienta, Prestamo, PrestamoItem, utcnow
from routes.solicitudes import _texto

herramientas_bp = Blueprint("herramientas", __name__, url_prefix="/api/herramientas")


def _en_uso():
    """{herramienta_id: [{"mecanico", "cantidad"}]} de las piezas que no se han devuelto"""
    rows = (
        db.session.query(PrestamoItem.herramienta_id, Prestamo.mecanico, func.sum(PrestamoItem.cantidad))
        .join(Prestamo)
        .filter(PrestamoItem.devuelto_at.is_(None))
        .group_by(PrestamoItem.herramienta_id, Prestamo.mecanico)
        .order_by(Prestamo.mecanico)
        .all()
    )
    en_uso = {}
    for hid, mecanico, total in rows:
        en_uso.setdefault(hid, []).append({"mecanico": mecanico, "cantidad": int(total)})
    return en_uso


def _prestadas():
    """{herramienta_id: piezas prestadas sin devolver}"""
    return {hid: sum(e["cantidad"] for e in lista) for hid, lista in _en_uso().items()}


def _entero(valor):
    try:
        return int(valor)
    except (TypeError, ValueError):
        return None


def _nombre_y_cantidad(data):
    """Valida nombre y cantidad del catálogo. Devuelve (nombre, cantidad, error)."""
    nombre = " ".join((data.get("nombre") or "").split())
    cantidad = _entero(data.get("cantidad"))
    if not nombre:
        return None, None, "Escribe el nombre de la herramienta"
    if len(nombre) > 120:
        return None, None, "El nombre es demasiado largo (máximo 120)"
    if cantidad is None or cantidad < 1:
        return None, None, "La cantidad debe ser al menos 1"
    return nombre, cantidad, None


def _nombre_repetido(nombre, excepto_id=None):
    query = Herramienta.query.filter(func.lower(Herramienta.nombre) == nombre.lower())
    if excepto_id:
        query = query.filter(Herramienta.id != excepto_id)
    return query.first() is not None


# ─── Catálogo ───
@herramientas_bp.route("", methods=["GET"])
@herramientas_bp.route("/", methods=["GET"])
@role_required("mecanico")
def listar_herramientas():
    en_uso = _en_uso()
    items = Herramienta.query.order_by(Herramienta.nombre).all()
    return jsonify([h.to_dict(en_uso.get(h.id)) for h in items]), 200


@herramientas_bp.route("", methods=["POST"])
@herramientas_bp.route("/", methods=["POST"])
@role_required("mecanico")
def crear_herramienta():
    nombre, cantidad, error = _nombre_y_cantidad(request.get_json() or {})
    if error:
        return jsonify({"msg": error}), 400
    if _nombre_repetido(nombre):
        return jsonify({"msg": "Esa herramienta ya está en el catálogo"}), 409

    h = Herramienta(nombre=nombre, cantidad=cantidad)
    db.session.add(h)
    db.session.commit()
    return jsonify(h.to_dict()), 201


@herramientas_bp.route("/<int:herramienta_id>", methods=["PUT"])
@role_required("mecanico")
def editar_herramienta(herramienta_id):
    h = db.session.get(Herramienta, herramienta_id)
    if not h:
        return jsonify({"msg": "Herramienta no encontrada"}), 404

    nombre, cantidad, error = _nombre_y_cantidad(request.get_json() or {})
    if error:
        return jsonify({"msg": error}), 400
    if _nombre_repetido(nombre, h.id):
        return jsonify({"msg": "Esa herramienta ya está en el catálogo"}), 409
    en_uso = _en_uso().get(h.id)
    prestadas = sum(e["cantidad"] for e in en_uso or [])
    if cantidad < prestadas:
        return jsonify({"msg": f"Hay {prestadas} prestada(s); la cantidad no puede ser menor"}), 400

    h.nombre = nombre
    h.cantidad = cantidad
    db.session.commit()
    return jsonify(h.to_dict(en_uso)), 200


@herramientas_bp.route("/<int:herramienta_id>", methods=["DELETE"])
@role_required("mecanico")
def eliminar_herramienta(herramienta_id):
    h = db.session.get(Herramienta, herramienta_id)
    if not h:
        return jsonify({"msg": "Herramienta no encontrada"}), 404
    # Si ya se prestó, borrarla rompería el historial de préstamos
    if PrestamoItem.query.filter_by(herramienta_id=h.id).first():
        return jsonify({"msg": "No se puede eliminar: la herramienta ya tiene préstamos registrados"}), 409

    db.session.delete(h)
    db.session.commit()
    return jsonify({"msg": "Herramienta eliminada"}), 200


# ─── Préstamos ───
@herramientas_bp.route("/prestamos", methods=["GET"])
@role_required("mecanico")
def listar_prestamos():
    # estado: "activos" (con herramientas sin devolver) o "devueltos"
    estado = request.args.get("estado", "activos")

    query = Prestamo.query
    if estado == "devueltos":
        query = query.filter(Prestamo.fecha_devolucion.isnot(None)).order_by(Prestamo.fecha_devolucion.desc())
    else:
        query = query.filter(Prestamo.fecha_devolucion.is_(None)).order_by(Prestamo.fecha_prestamo.desc())

    return jsonify([p.to_dict() for p in query.limit(200).all()]), 200


@herramientas_bp.route("/prestamos", methods=["POST"])
@role_required("mecanico")
def crear_prestamo():
    user = get_current_user()
    data = request.get_json() or {}

    mecanico = " ".join((data.get("mecanico") or "").split())
    if not mecanico:
        return jsonify({"msg": "Escribe el nombre del mecánico que recibe las herramientas"}), 400
    if len(mecanico) > 150:
        return jsonify({"msg": "El nombre del mecánico es demasiado largo (máximo 150)"}), 400

    # Junta las piezas por herramienta (por si se repite en la lista)
    pedidas = {}
    for item in data.get("items") or []:
        hid = _entero(item.get("herramienta_id"))
        cant = _entero(item.get("cantidad"))
        if not hid or not cant or cant < 1:
            return jsonify({"msg": "Revisa las herramientas y cantidades"}), 400
        pedidas[hid] = pedidas.get(hid, 0) + cant
    if not pedidas:
        return jsonify({"msg": "Agrega al menos una herramienta"}), 400

    prestadas = _prestadas()
    prestamo = Prestamo(
        mecanico=mecanico,
        registrado_por_id=user.id,
        observaciones=_texto(data.get("observaciones")),
    )
    for hid, cant in pedidas.items():
        h = db.session.get(Herramienta, hid)
        if not h:
            return jsonify({"msg": "Una de las herramientas ya no existe"}), 400
        disponibles = max(h.cantidad - prestadas.get(h.id, 0), 0)
        if cant > disponibles:
            return jsonify({"msg": f"Solo hay {disponibles} disponible(s) de «{h.nombre}»"}), 400
        prestamo.items.append(PrestamoItem(herramienta_id=h.id, cantidad=cant))

    db.session.add(prestamo)
    db.session.commit()
    return jsonify(prestamo.to_dict()), 201


@herramientas_bp.route("/prestamos/<int:prestamo_id>/devolver", methods=["POST"])
@role_required("mecanico")
def devolver(prestamo_id):
    """
    Registra lo que el mecánico regresó.
    - items: [{"id", "cantidad"}] → solo esas herramientas (y esas piezas).
      Si regresa menos piezas de las que se llevó, el resto queda pendiente.
    - sin items → regresó todo.
    """
    p = db.session.get(Prestamo, prestamo_id)
    if not p:
        return jsonify({"msg": "Préstamo no encontrado"}), 404
    if p.fecha_devolucion:
        return jsonify({"msg": "Este préstamo ya se devolvió"}), 400

    pedidos = (request.get_json(silent=True) or {}).get("items")
    pendientes = {i.id: i for i in p.items if i.devuelto_at is None}
    ahora = utcnow()

    if not pedidos:
        for item in pendientes.values():
            item.devuelto_at = ahora
    else:
        for pedido in pedidos:
            item = pendientes.get(_entero(pedido.get("id")))
            cant = _entero(pedido.get("cantidad"))
            if not item:
                return jsonify({"msg": "Esa herramienta ya se había devuelto"}), 400
            if cant is None:
                cant = item.cantidad
            if cant < 1 or cant > item.cantidad:
                return jsonify({"msg": f"Revisa cuántas piezas regresó de «{item.herramienta.nombre}»"}), 400
            if cant == item.cantidad:
                item.devuelto_at = ahora
            else:
                # Devolución parcial: se separan las piezas devueltas; el resto sigue pendiente
                item.cantidad -= cant
                p.items.append(PrestamoItem(herramienta_id=item.herramienta_id, cantidad=cant, devuelto_at=ahora))
    # Ya regresó todo: sale de la lista de pendientes (queda en el historial)
    if all(i.devuelto_at for i in p.items):
        p.fecha_devolucion = ahora

    db.session.commit()
    return jsonify(p.to_dict()), 200
