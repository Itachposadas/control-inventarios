# backend/routes/almacen.py
# Almacén (control de refacciones): el cuarto donde Coordinación de Parque
# Vehicular guarda lo que llega en cantidad (aceites, barriles, etc.).
# Lo captura parque vehicular; administración solo consulta.
# Las piezas compradas para un servicio siguen por la orden de compra: este
# módulo no la toca. Lo que sale del almacén se liga al servicio donde se usó.
from decimal import Decimal, InvalidOperation
from flask import Blueprint, request, jsonify
from sqlalchemy import func
from auth_utils import role_required, get_current_user
from extensions import db
from models import MaterialAlmacen, MovimientoAlmacen, Solicitud, material_almacen_de
from paginacion import paginar
from routes.solicitudes import _texto, _registrar, EN_TALLER
from validacion import una_linea

almacen_bp = Blueprint("almacen", __name__, url_prefix="/api/almacen")

MAXIMO = Decimal("999999")


def _cantidad(valor, nombre="La cantidad", permitir_cero=False):
    """Número positivo con hasta 2 decimales. Devuelve (Decimal, error)."""
    if valor is None or isinstance(valor, (bool, dict, list)):
        return None, f"{nombre} debe ser un número"
    try:
        cantidad = Decimal(str(valor).strip().replace(",", "."))
        if not cantidad.is_finite():
            raise InvalidOperation
        cantidad = cantidad.quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError, TypeError):
        return None, f"{nombre} debe ser un número"
    if cantidad < 0 or (cantidad == 0 and not permitir_cero):
        return None, f"{nombre} debe ser mayor que cero"
    if cantidad > MAXIMO:
        return None, f"{nombre} es demasiado grande"
    return cantidad, None


def _fmt(cantidad, unidad):
    """4.00 → "4 Litro"; 2.50 → "2.5 Litro" (para la bitácora del servicio)."""
    n = f"{float(cantidad):g}"
    return f"{n} {unidad}"


def _material_bloqueado(material_id):
    """El material con candado de escritura, para que dos movimientos al mismo tiempo no descuadren la existencia."""
    try:
        material_id = int(material_id)
    except (TypeError, ValueError):
        return None
    return MaterialAlmacen.query.filter_by(id=material_id).with_for_update().first()


def _mover(material, tipo, cantidad, user, solicitud=None, nota=None):
    """Registra el movimiento y actualiza la existencia."""
    m = MovimientoAlmacen(
        material=material, tipo=tipo, cantidad=cantidad, solicitud=solicitud,
        nota=_texto(nota), registrado_por_id=user.id,
    )
    db.session.add(m)
    material.existencia = Decimal(material.existencia or 0) + Decimal(str(m.efecto()))
    return m


# ─── Catálogo y existencias ───
@almacen_bp.route("/materiales", methods=["GET"])
@role_required()
def listar_materiales():
    """?todos=1 incluye los dados de baja."""
    query = MaterialAlmacen.query
    if request.args.get("todos") != "1":
        query = query.filter_by(activo=True)
    return jsonify([m.to_dict() for m in query.order_by(MaterialAlmacen.nombre).all()]), 200


def _datos_material(data, excepto_id=None):
    """Valida nombre, unidad y mínimo. Devuelve (campos, error)."""
    nombre = una_linea(data.get("nombre"))
    unidad = una_linea(data.get("unidad_medida"))
    if not nombre:
        return None, "Escribe el nombre del material"
    if len(nombre) > 150:
        return None, "El nombre es demasiado largo (máximo 150)"
    if not unidad:
        return None, "Escribe la unidad de medida (ej. Litro, Pieza, Barril)"
    if len(unidad) > 40:
        return None, "La unidad de medida es demasiado larga (máximo 40)"
    repetido = MaterialAlmacen.query.filter(func.lower(MaterialAlmacen.nombre) == nombre.lower())
    if excepto_id:
        repetido = repetido.filter(MaterialAlmacen.id != excepto_id)
    if repetido.first():
        return None, "Ese material ya está en el almacén"
    minimo = None
    if data.get("minimo") not in (None, ""):
        minimo, error = _cantidad(data.get("minimo"), "El mínimo", permitir_cero=True)
        if error:
            return None, error
    return {"nombre": nombre, "unidad_medida": unidad, "minimo": minimo}, None


@almacen_bp.route("/materiales", methods=["POST"])
@role_required("mecanico")
def crear_material():
    """{nombre, unidad_medida, minimo?, existencia_inicial?}"""
    data = request.get_json() or {}
    campos, error = _datos_material(data)
    if error:
        return jsonify({"msg": error}), 400
    inicial = None
    if data.get("existencia_inicial") not in (None, "", 0, "0"):
        inicial, error = _cantidad(data.get("existencia_inicial"), "La existencia inicial")
        if error:
            return jsonify({"msg": error}), 400

    user = get_current_user()
    material = MaterialAlmacen(**campos, existencia=0)
    db.session.add(material)
    if inicial:
        _mover(material, "entrada", inicial, user, nota="Existencia inicial")
    db.session.commit()
    return jsonify(material.to_dict()), 201


@almacen_bp.route("/materiales/<int:material_id>", methods=["PUT"])
@role_required("mecanico")
def editar_material(material_id):
    """{nombre, unidad_medida, minimo, activo}. La existencia solo cambia con movimientos."""
    material = db.session.get(MaterialAlmacen, material_id)
    if not material:
        return jsonify({"msg": "Material no encontrado"}), 404
    data = request.get_json() or {}
    campos, error = _datos_material(data, excepto_id=material.id)
    if error:
        return jsonify({"msg": error}), 400
    for k, v in campos.items():
        setattr(material, k, v)
    if "activo" in data:
        material.activo = bool(data["activo"])
    db.session.commit()
    return jsonify(material.to_dict()), 200


# ─── Movimientos ───
@almacen_bp.route("/entradas", methods=["POST"])
@role_required("mecanico")
def registrar_entrada():
    """{material_id, cantidad, nota}: llegó material (ej. un barril de aceite)."""
    data = request.get_json() or {}
    material = _material_bloqueado(data.get("material_id"))
    if not material or not material.activo:
        return jsonify({"msg": "Elige un material del almacén"}), 400
    cantidad, error = _cantidad(data.get("cantidad"))
    if error:
        return jsonify({"msg": error}), 400
    m = _mover(material, "entrada", cantidad, get_current_user(), nota=data.get("nota"))
    db.session.commit()
    return jsonify(m.to_dict()), 201


@almacen_bp.route("/ajustes", methods=["POST"])
@role_required("mecanico")
def registrar_ajuste():
    """{material_id, existencia_real, nota}: corrige la existencia según el conteo físico."""
    data = request.get_json() or {}
    material = _material_bloqueado(data.get("material_id"))
    if not material:
        return jsonify({"msg": "Material no encontrado"}), 404
    real, error = _cantidad(data.get("existencia_real"), "La existencia contada", permitir_cero=True)
    if error:
        return jsonify({"msg": error}), 400
    if not _texto(data.get("nota")):
        return jsonify({"msg": "Escribe el motivo del ajuste (ej. conteo físico, merma, derrame)"}), 400
    diferencia = real - Decimal(material.existencia or 0)
    if diferencia == 0:
        return jsonify({"msg": "La existencia contada es igual a la registrada; no hay nada que ajustar"}), 400
    m = _mover(material, "ajuste", diferencia, get_current_user(), nota=data.get("nota"))
    db.session.commit()
    return jsonify(m.to_dict()), 201


@almacen_bp.route("/movimientos", methods=["GET"])
@role_required()
def listar_movimientos():
    """?material_id= &tipo=entrada|salida|devolucion|ajuste &pagina= (los más recientes primero)"""
    query = MovimientoAlmacen.query
    if request.args.get("material_id"):
        query = query.filter(MovimientoAlmacen.material_id == request.args.get("material_id", type=int))
    tipo = (request.args.get("tipo") or "").strip()
    if tipo:
        query = query.filter(MovimientoAlmacen.tipo == tipo)
    query = query.order_by(MovimientoAlmacen.created_at.desc(), MovimientoAlmacen.id.desc())
    registros, info = paginar(query, por_defecto=25)
    return jsonify({"items": [m.to_dict() for m in registros], **info}), 200


# ─── Material del almacén usado en un servicio ───
def _servicio_en_taller(solicitud_id):
    s = db.session.get(Solicitud, solicitud_id)
    if not s:
        return None, (jsonify({"msg": "Servicio no encontrado"}), 404)
    if s.estado not in EN_TALLER:
        return None, (jsonify({"msg": "El servicio ya se entregó; ya no se puede mover material"}), 409)
    return s, None


@almacen_bp.route("/servicios/<int:solicitud_id>/salidas", methods=["POST"])
@role_required("mecanico")
def usar_en_servicio(solicitud_id):
    """{material_id, cantidad, nota?}: se tomó material del almacén para este servicio."""
    s, error = _servicio_en_taller(solicitud_id)
    if error:
        return error
    data = request.get_json() or {}
    material = _material_bloqueado(data.get("material_id"))
    if not material or not material.activo:
        return jsonify({"msg": "Elige un material del almacén"}), 400
    cantidad, msg = _cantidad(data.get("cantidad"))
    if msg:
        return jsonify({"msg": msg}), 400
    if cantidad > Decimal(material.existencia or 0):
        return jsonify({
            "msg": f"Solo hay {_fmt(material.existencia, material.unidad_medida)} de {material.nombre} en el almacén"
        }), 409

    user = get_current_user()
    _mover(material, "salida", cantidad, user, solicitud=s, nota=data.get("nota"))
    _registrar(s, user, f"Usó del almacén: {_fmt(cantidad, material.unidad_medida)} de {material.nombre}")
    db.session.commit()
    return jsonify(material_almacen_de([s.id]).get(s.id, [])), 201


@almacen_bp.route("/servicios/<int:solicitud_id>/devoluciones", methods=["POST"])
@role_required("mecanico")
def devolver_de_servicio(solicitud_id):
    """{material_id, cantidad}: sobró material de este servicio y regresa al almacén."""
    s, error = _servicio_en_taller(solicitud_id)
    if error:
        return error
    data = request.get_json() or {}
    material = _material_bloqueado(data.get("material_id"))
    if not material:
        return jsonify({"msg": "Material no encontrado"}), 404
    cantidad, msg = _cantidad(data.get("cantidad"))
    if msg:
        return jsonify({"msg": msg}), 400
    usado = next((x["cantidad"] for x in material_almacen_de([s.id]).get(s.id, []) if x["material_id"] == material.id), 0)
    if float(cantidad) > usado:
        return jsonify({
            "msg": f"En este servicio solo se usaron {_fmt(usado, material.unidad_medida)} de {material.nombre}"
        }), 409

    user = get_current_user()
    _mover(material, "devolucion", cantidad, user, solicitud=s, nota=data.get("nota"))
    _registrar(s, user, f"Devolvió al almacén: {_fmt(cantidad, material.unidad_medida)} de {material.nombre}")
    db.session.commit()
    return jsonify(material_almacen_de([s.id]).get(s.id, [])), 201
