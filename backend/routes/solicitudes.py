# backend/routes/solicitudes.py
from flask import Blueprint, request, jsonify
from extensions import db
from models import (
    Solicitud, SolicitudRefaccion, SolicitudEvento, Vehiculo, Usuario,
    ESTADOS_SOLICITUD, TIPOS_SOLICITUD, PRIORIDADES, utcnow,
)
from auth_utils import role_required, get_current_user

solicitudes_bp = Blueprint("solicitudes", __name__, url_prefix="/api/solicitudes")

ESTADO_LABEL = {
    "recibida": "Recibida",
    "diagnostico": "Diagnóstico",
    "reparacion": "Reparación",
    "completada": "Completada",
    "entregada": "Entregada",
}

# Campos del formato de ingreso: clave en el JSON → columna del modelo
CAMPOS_INGRESO = {
    "marca": "ing_marca",
    "placas": "ing_placas",
    "modelo": "ing_modelo",
    "area": "ing_area",
    "unidad": "ing_unidad",
    "color": "ing_color",
    "serie": "ing_serie",
    "no_inventario": "ing_no_inventario",
}

CAMPOS_TEXTO = ("observaciones_ingreso", "fallas", "acciones", "observaciones")


# ─── Helpers ───

def _texto(valor):
    return (str(valor) if valor is not None else "").strip() or None


def _to_int(valor):
    try:
        return int(valor)
    except (TypeError, ValueError):
        return 0


def _puede_ver(user, s):
    # Admin y mecánicos consultan cualquier solicitud (historial de los vehículos)
    return user.role in ("admin", "mecanico")


def _puede_editar(user, s):
    # Admin: solo sus campos (costo y mecánico asignado)
    if user.role == "admin":
        return True
    # El mecánico llena solo las suyas y hasta que las marca como completadas
    return (
        user.role == "mecanico"
        and s.mecanico_id == user.id
        and s.estado not in ("completada", "entregada")
    )


def _registrar(s, user, accion, nota=None):
    s.eventos.append(SolicitudEvento(usuario_id=user.id, accion=accion, nota=_texto(nota)))


def _aplicar_campos(s, data, user):
    """Copia al modelo los campos permitidos. Devuelve un mensaje de error o None."""
    if user.role == "admin":
        return _aplicar_campos_admin(s, data)
    return _aplicar_campos_mecanico(s, data)


def _aplicar_campos_mecanico(s, data):
    """Formato de ingreso y trabajo realizado: solo lo llena el mecánico."""
    if "tipo" in data:
        if data["tipo"] not in TIPOS_SOLICITUD:
            return "Tipo inválido"
        s.tipo = data["tipo"]

    if "prioridad" in data:
        if data["prioridad"] not in PRIORIDADES:
            return "Prioridad inválida"
        s.prioridad = data["prioridad"]

    ingreso = data.get("ingreso")
    if isinstance(ingreso, dict):
        for clave, columna in CAMPOS_INGRESO.items():
            if clave in ingreso:
                setattr(s, columna, _texto(ingreso[clave]))

    if "checklist" in data:
        if not isinstance(data["checklist"], dict):
            return "Checklist inválido"
        s.checklist = {str(k)[:60]: bool(v) for k, v in data["checklist"].items()}

    for campo in CAMPOS_TEXTO:
        if campo in data:
            setattr(s, campo, _texto(data[campo]))

    if "refacciones" in data:
        if not isinstance(data["refacciones"], list):
            return "Refacciones inválidas"
        nuevas = []
        for r in data["refacciones"]:
            descripcion = _texto((r or {}).get("descripcion"))
            if not descripcion:
                continue  # renglones vacíos se ignoran
            if r.get("tipo") not in ("utilizada", "por_comprar"):
                return "Tipo de refacción inválido"
            try:
                cantidad = max(1, int(r.get("cantidad") or 1))
            except (TypeError, ValueError):
                return "Cantidad de refacción inválida"
            nuevas.append(SolicitudRefaccion(
                tipo=r["tipo"], descripcion=descripcion[:255], cantidad=cantidad,
            ))
        s.refacciones = nuevas
    return None


def _aplicar_campos_admin(s, data):
    """El admin solo captura el costo y puede reasignar el mecánico."""
    if "costo" in data:
        costo = data["costo"]
        if costo in ("", None):
            s.costo = None
        else:
            try:
                costo = float(costo)
            except (TypeError, ValueError):
                return "Costo inválido"
            if costo < 0:
                return "El costo no puede ser negativo"
            s.costo = costo

    if "mecanico_id" in data:
        error = _asignar_mecanico(s, data["mecanico_id"])
        if error:
            return error
    return None


def _asignar_mecanico(s, mecanico_id):
    if not mecanico_id:
        return "Debes asignar un mecánico"
    mec = db.session.get(Usuario, _to_int(mecanico_id))
    if not mec or mec.role != "mecanico" or not mec.activo:
        return "El mecánico seleccionado no es válido"
    s.mecanico_id = mec.id
    return None


# ─── Listar ───
@solicitudes_bp.route("", methods=["GET"])
@solicitudes_bp.route("/", methods=["GET"])
@role_required()
def listar():
    user = get_current_user()
    q = (request.args.get("q") or "").strip()
    estado = (request.args.get("estado") or "").strip()
    prioridad = (request.args.get("prioridad") or "").strip()
    mecanico_id = request.args.get("mecanico_id", type=int)
    vehiculo_id = request.args.get("vehiculo_id", type=int)

    query = Solicitud.query.join(Vehiculo)

    if user.role == "mecanico":
        query = query.filter(Solicitud.mecanico_id == user.id)
    elif mecanico_id:
        query = query.filter(Solicitud.mecanico_id == mecanico_id)

    # "abiertas" = todo lo que no se ha entregado; "cerradas" = completadas y entregadas
    if estado == "abiertas":
        query = query.filter(Solicitud.estado != "entregada")
    elif estado == "cerradas":
        query = query.filter(Solicitud.estado.in_(("completada", "entregada")))
    elif estado:
        query = query.filter(Solicitud.estado == estado)

    if prioridad:
        query = query.filter(Solicitud.prioridad == prioridad)
    if vehiculo_id:
        query = query.filter(Solicitud.vehiculo_id == vehiculo_id)
    if q:
        like = f"%{q}%"
        query = query.filter(db.or_(
            Solicitud.folio.like(like),
            Solicitud.ing_placas.like(like),
            Vehiculo.no_inventario.like(like),
            Vehiculo.numero_economico.like(like),
            Vehiculo.unidad.like(like),
        ))

    items = query.order_by(Solicitud.fecha_ingreso.desc(), Solicitud.id.desc()).all()
    return jsonify([s.to_dict() for s in items]), 200


# ─── Detalle ───
@solicitudes_bp.route("/<int:solicitud_id>", methods=["GET"])
@role_required()
def obtener(solicitud_id):
    user = get_current_user()
    s = db.session.get(Solicitud, solicitud_id)
    if not s or not _puede_ver(user, s):
        return jsonify({"msg": "Solicitud no encontrada"}), 404
    return jsonify(s.to_dict(detalle=True)), 200


# ─── Crear (formato de ingreso a taller): solo el mecánico ───
@solicitudes_bp.route("", methods=["POST"])
@solicitudes_bp.route("/", methods=["POST"])
@role_required("mecanico")
def crear():
    user = get_current_user()
    data = request.get_json() or {}

    vehiculo = db.session.get(Vehiculo, _to_int(data.get("vehiculo_id")))
    if not vehiculo:
        return jsonify({"msg": "Selecciona un vehículo"}), 400
    if vehiculo.estado == "baja":
        return jsonify({"msg": "El vehículo está dado de baja"}), 400

    abierta = vehiculo.solicitudes.filter(Solicitud.estado != "entregada").first()
    if abierta:
        return jsonify({"msg": f"Este vehículo ya tiene una solicitud abierta ({abierta.folio})"}), 409

    s = Solicitud(vehiculo=vehiculo, creado_por_id=user.id, estado="recibida")

    # Datos de ingreso: se copian del catálogo; el formulario puede corregirlos
    s.ing_marca = vehiculo.marca
    s.ing_placas = vehiculo.placas
    s.ing_modelo = vehiculo.modelo
    s.ing_area = vehiculo.area
    s.ing_unidad = vehiculo.unidad
    s.ing_serie = vehiculo.serie
    s.ing_no_inventario = vehiculo.no_inventario

    # El mecánico que llena el formato queda asignado
    s.mecanico_id = user.id

    error = _aplicar_campos(s, data, user)
    if error:
        return jsonify({"msg": error}), 400

    vehiculo.estado = "mantenimiento"
    db.session.add(s)
    db.session.flush()  # obtiene el id para armar el folio
    s.folio = f"SOL-{s.fecha_ingreso.year}-{s.id:04d}"
    _registrar(s, user, "Registró el ingreso a taller")
    db.session.commit()

    return jsonify(s.to_dict(detalle=True)), 201


# ─── Editar ───
@solicitudes_bp.route("/<int:solicitud_id>", methods=["PUT"])
@role_required("admin", "mecanico")
def editar(solicitud_id):
    user = get_current_user()
    s = db.session.get(Solicitud, solicitud_id)
    if not s or not _puede_ver(user, s):
        return jsonify({"msg": "Solicitud no encontrada"}), 404
    if not _puede_editar(user, s):
        return jsonify({"msg": "Ya no puedes modificar esta solicitud"}), 403

    data = request.get_json() or {}
    costo_antes = s.costo
    mecanico_antes = s.mecanico_id

    error = _aplicar_campos(s, data, user)
    if error:
        db.session.rollback()
        return jsonify({"msg": error}), 400

    if s.mecanico_id != mecanico_antes:
        mec = db.session.get(Usuario, s.mecanico_id)
        _registrar(s, user, f"Asignó a {mec.nombre_completo or mec.username}")
    elif s.costo != costo_antes:
        _registrar(s, user, "Actualizó el costo")
    else:
        _registrar(s, user, "Actualizó la información")
    db.session.commit()
    return jsonify(s.to_dict(detalle=True)), 200


# ─── Cambiar estado ───
@solicitudes_bp.route("/<int:solicitud_id>/estado", methods=["POST"])
@role_required("admin", "mecanico")
def cambiar_estado(solicitud_id):
    user = get_current_user()
    s = db.session.get(Solicitud, solicitud_id)
    if not s or not _puede_ver(user, s):
        return jsonify({"msg": "Solicitud no encontrada"}), 404

    data = request.get_json() or {}
    nuevo = data.get("estado")
    if nuevo not in ESTADOS_SOLICITUD:
        return jsonify({"msg": "Estado inválido"}), 400

    actual_i = ESTADOS_SOLICITUD.index(s.estado)
    nuevo_i = ESTADOS_SOLICITUD.index(nuevo)
    avanza = nuevo_i == actual_i + 1
    regresa = nuevo_i == actual_i - 1

    # Reglas por rol
    if user.role == "mecanico":
        if s.mecanico_id != user.id:
            return jsonify({"msg": "Esta solicitud no está asignada a ti"}), 403
        if not avanza or nuevo == "entregada":
            return jsonify({"msg": "Solo puedes avanzar al siguiente paso"}), 403
    elif avanza and nuevo != "entregada":
        # El admin solo entrega; los demás pasos los registra el mecánico
        return jsonify({"msg": "El avance del servicio lo registra el mecánico"}), 403
    elif not (avanza or regresa):
        return jsonify({"msg": "Solo se puede avanzar o regresar un paso"}), 400

    # Requisitos para avanzar
    if avanza and nuevo == "reparacion" and not s.fallas:
        return jsonify({"msg": "Captura el diagnóstico de fallas antes de pasar a reparación"}), 400
    if avanza and nuevo == "completada" and not s.acciones:
        return jsonify({"msg": "Captura las acciones realizadas antes de completar"}), 400

    s.estado = nuevo

    # El estado del vehículo se mantiene en sincronía
    if nuevo == "entregada":
        s.fecha_entrega = utcnow()
        if s.vehiculo.estado != "baja":
            s.vehiculo.estado = "activo"
    elif s.fecha_entrega:  # se regresó desde "entregada"
        s.fecha_entrega = None
        if s.vehiculo.estado != "baja":
            s.vehiculo.estado = "mantenimiento"

    verbo = "Avanzó" if avanza else "Regresó"
    _registrar(s, user, f"{verbo} a {ESTADO_LABEL[nuevo]}", data.get("nota"))
    db.session.commit()
    return jsonify(s.to_dict(detalle=True)), 200


# ─── Eliminar ───
@solicitudes_bp.route("/<int:solicitud_id>", methods=["DELETE"])
@role_required("admin")
def eliminar(solicitud_id):
    s = db.session.get(Solicitud, solicitud_id)
    if not s:
        return jsonify({"msg": "Solicitud no encontrada"}), 404

    vehiculo = s.vehiculo
    era_abierta = s.estado != "entregada"
    db.session.delete(s)
    db.session.flush()

    # Si era la solicitud que tenía al vehículo en taller, vuelve a activo
    if era_abierta and vehiculo.estado == "mantenimiento":
        otra = vehiculo.solicitudes.filter(Solicitud.estado != "entregada").first()
        if not otra:
            vehiculo.estado = "activo"

    db.session.commit()
    return jsonify({"msg": "Solicitud eliminada"}), 200
