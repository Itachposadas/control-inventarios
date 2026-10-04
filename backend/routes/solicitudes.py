# backend/routes/solicitudes.py
from datetime import datetime, timedelta
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

CAMPOS_TEXTO = ("observaciones_ingreso", "fallas", "acciones", "observaciones")

# Mientras el servicio esté en alguno de estos pasos, el vehículo está en el taller.
# Al completarse, el vehículo vuelve a "activo" (la entrega es solo administrativa).
EN_TALLER = ("recibida", "diagnostico", "reparacion")


# ─── Helpers ───

def _sincronizar_vehiculo(vehiculo):
    """Mantenimiento si tiene un servicio en taller; activo si no (baja no se toca)."""
    if vehiculo.estado == "baja":
        return
    en_taller = vehiculo.solicitudes.filter(Solicitud.estado.in_(EN_TALLER)).first()
    vehiculo.estado = "mantenimiento" if en_taller else "activo"


def _texto(valor):
    return (str(valor) if valor is not None else "").strip() or None


# Hora del centro de México (UTC-6, sin horario de verano desde 2022)
UTC_OFFSET = timedelta(hours=6)


def _fecha_ingreso(texto):
    """'AAAA-MM-DD' (fecha local) → datetime UTC. Hoy conserva la hora actual."""
    try:
        dia = datetime.strptime(str(texto)[:10], "%Y-%m-%d").date()
    except ValueError:
        return None, "Fecha de ingreso inválida"
    ahora = utcnow()
    hoy = (ahora - UTC_OFFSET).date()
    if dia > hoy:
        return None, "La fecha de ingreso no puede ser futura"
    if dia.year < 2000:
        return None, "Fecha de ingreso inválida"
    if dia == hoy:
        return ahora, None
    # Otro día: se registra a mediodía (hora local) para que no cambie de fecha
    return datetime.combine(dia, datetime.min.time()) + timedelta(hours=12) + UTC_OFFSET, None


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

    # Los datos del vehículo (ingreso) NO se reciben del mecánico: se copian del
    # catálogo al registrar el ingreso y solo el admin los corrige en Vehículos.

    if "checklist" in data:
        # Accesorios y herramientas: cada concepto es SI (true) o NO (false)
        checklist = data["checklist"]
        if not isinstance(checklist, dict) or not all(isinstance(v, bool) for v in checklist.values()):
            return "Accesorios inválidos: cada concepto debe ser SI o NO"
        s.checklist = {str(k)[:60]: v for k, v in checklist.items()}

    if "total_birlos" in data:
        birlos = data["total_birlos"]
        if birlos in ("", None):
            s.total_birlos = None
        else:
            try:
                birlos = int(birlos)
            except (TypeError, ValueError):
                return "El total de birlos debe ser un número"
            if not 0 <= birlos <= 200:
                return "El total de birlos debe estar entre 0 y 200"
            s.total_birlos = birlos

    if "hoja_no" in data or "hoja_total" in data:
        hoja_no = _to_int(data.get("hoja_no", s.hoja_no or 1))
        hoja_total = _to_int(data.get("hoja_total", s.hoja_total or 1))
        if hoja_no < 1 or hoja_total < 1 or hoja_no > hoja_total or hoja_total > 99:
            return "La hoja debe ser válida (ej. hoja 1 de 2)"
        s.hoja_no, s.hoja_total = hoja_no, hoja_total

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
    elif estado == "en_taller":
        query = query.filter(Solicitud.estado.in_(EN_TALLER))
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

    en_taller = vehiculo.solicitudes.filter(Solicitud.estado.in_(EN_TALLER)).first()
    if en_taller:
        return jsonify({"msg": f"Este vehículo ya está en el taller ({en_taller.folio})"}), 409

    s = Solicitud(vehiculo=vehiculo, creado_por_id=user.id, estado="recibida")

    # Fecha de ingreso capturada en el formato (por defecto, ahora)
    if data.get("fecha_ingreso"):
        fecha, error = _fecha_ingreso(data["fecha_ingreso"])
        if error:
            return jsonify({"msg": error}), 400
        s.fecha_ingreso = fecha

    # Datos del vehículo: se copian del catálogo tal como están al ingresar
    # (quedan como registro histórico; el mecánico solo los ve)
    s.ing_marca = vehiculo.marca
    s.ing_placas = vehiculo.placas
    s.ing_modelo = vehiculo.modelo
    s.ing_area = vehiculo.area
    s.ing_unidad = vehiculo.unidad
    s.ing_serie = vehiculo.serie
    s.ing_no_inventario = vehiculo.no_inventario
    s.ing_color = vehiculo.color

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

    # Evidencia fotográfica obligatoria
    tiene = {f.tipo for f in s.fotos}
    if avanza and nuevo == "diagnostico" and "llegada" not in tiene:
        return jsonify({"msg": "Sube la foto de llegada antes de pasar a diagnóstico"}), 400
    if avanza and nuevo == "completada":
        faltan = [n for t, n in (("reparacion", "reparación"), ("final", "final")) if t not in tiene]
        if faltan:
            return jsonify({"msg": f"Sube la foto de {' y '.join(faltan)} antes de completar"}), 400

    s.estado = nuevo

    if nuevo == "entregada":
        s.fecha_entrega = utcnow()
    elif s.fecha_entrega:  # se regresó desde "entregada"
        s.fecha_entrega = None

    # Completada → el vehículo vuelve a activo; si se regresa a reparación, vuelve a mantenimiento
    _sincronizar_vehiculo(s.vehiculo)

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
    estaba_en_taller = s.estado in EN_TALLER

    from routes.fotos import borrar_archivos_de  # import local: fotos importa este módulo
    borrar_archivos_de(s)
    db.session.delete(s)
    db.session.flush()

    # Si era la solicitud que tenía al vehículo en taller, se recalcula su estado
    if estaba_en_taller:
        _sincronizar_vehiculo(vehiculo)

    db.session.commit()
    return jsonify({"msg": "Solicitud eliminada"}), 200
