# backend/routes/solicitudes.py
# Servicios del taller. Se abren cuando el mecánico firma de recibido la
# solicitud del área (abrir_servicio) y avanzan por pasos:
#   diagnostico → ingreso → compra (solo si hay refacciones) → reparacion → entregada
# Cada paso tiene su formato y su endpoint; el admin solo puede regresar un paso.
from datetime import timedelta
from flask import Blueprint, request, jsonify
from extensions import db
from models import (
    Solicitud, SolicitudEvento, Vehiculo, Usuario, RefaccionServicio, OrdenCompra, PeticionServicio,
    ESTADOS_SOLICITUD, TIPOS_SOLICITUD, PRIORIDADES, utcnow,
)
from auth_utils import role_required, get_current_user
from firmas import validar_firma, validar_nombre

solicitudes_bp = Blueprint("solicitudes", __name__, url_prefix="/api/solicitudes")

ESTADO_LABEL = {
    "diagnostico": "Diagnóstico",
    "ingreso": "Formato de ingreso",
    "compra": "Orden de compra",
    "reparacion": "Reparación",
    "entregada": "Entregada",
}

CAMPOS_TEXTO = ("observaciones_ingreso", "fallas", "acciones_a_realizar", "acciones", "observaciones")

# Mientras el servicio no se entregue, el vehículo está en el taller
EN_TALLER = ("diagnostico", "ingreso", "compra", "reparacion")

TIPOS_FOTO_REQUERIDOS = (("llegada", "llegada"), ("reparacion", "reparación"), ("final", "final"))


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
    # El mecánico llena solo las suyas y hasta que entrega el vehículo
    return user.role == "mecanico" and s.mecanico_id == user.id and s.estado != "entregada"


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

    # "abiertas"/"en_taller" = todo lo que no se ha entregado; "cerradas" = entregadas
    if estado in ("abiertas", "en_taller"):
        query = query.filter(Solicitud.estado.in_(EN_TALLER))
    elif estado == "cerradas":
        query = query.filter(Solicitud.estado == "entregada")
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


# ─── Abrir el servicio: al firmar de recibido la solicitud del área ───
def abrir_servicio(peticion, user):
    """Crea el servicio (paso Diagnóstico) de una solicitud del área.
    Devuelve (servicio, error); el error es (mensaje, código)."""
    vehiculo = peticion.vehiculo
    if vehiculo.estado == "baja":
        return None, ("El vehículo está dado de baja", 400)
    en_taller = vehiculo.solicitudes.filter(Solicitud.estado.in_(EN_TALLER)).first()
    if en_taller:
        return None, (f"Este vehículo ya está en el taller ({en_taller.folio})", 409)

    # La fecha de recepción es el momento en que el mecánico firma de recibido
    s = Solicitud(vehiculo=vehiculo, creado_por_id=user.id, estado="diagnostico", fecha_ingreso=utcnow())
    # Datos del vehículo: se copian del catálogo tal como están al recibirlo
    # (quedan como registro histórico; el mecánico solo los ve)
    s.ing_marca = vehiculo.marca
    s.ing_placas = vehiculo.placas
    s.ing_modelo = vehiculo.modelo
    s.ing_area = vehiculo.area
    s.ing_unidad = vehiculo.unidad
    s.ing_serie = vehiculo.serie
    s.ing_no_inventario = vehiculo.no_inventario
    s.ing_color = vehiculo.color
    s.mecanico_id = user.id  # el mecánico responsable queda asignado

    vehiculo.estado = "mantenimiento"
    db.session.add(s)
    db.session.flush()  # obtiene el id para armar el folio
    s.folio = f"SOL-{s.fecha_ingreso.year}-{s.id:04d}"
    _registrar(s, user, f"Recibió la solicitud {peticion.folio} del área {vehiculo.area or '—'}")
    return s, None


def _servicio_del_mecanico(solicitud_id, paso):
    """Servicio del mecánico en sesión que está en `paso`. Devuelve (user, s, error)."""
    user = get_current_user()
    s = db.session.get(Solicitud, solicitud_id)
    if not s:
        return user, None, (jsonify({"msg": "Servicio no encontrado"}), 404)
    if s.mecanico_id != user.id:
        return user, None, (jsonify({"msg": "Este servicio no está asignado a ti"}), 403)
    if s.estado != paso:
        return user, None, (jsonify({"msg": f"El servicio está en {ESTADO_LABEL[s.estado]}"}), 409)
    return user, s, None


def _despues_del_ingreso(s):
    """Con refacciones va a la orden de compra; sin ellas, directo a reparación."""
    return "compra" if s.piezas else "reparacion"


def _avanzar(s, user, nuevo, nota=None):
    s.estado = nuevo
    _sincronizar_vehiculo(s.vehiculo)
    _registrar(s, user, f"Avanzó a {ESTADO_LABEL[nuevo]}", nota)


# ─── 1. Diagnóstico ───
@solicitudes_bp.route("/<int:solicitud_id>/diagnostico", methods=["POST"])
@role_required("mecanico")
def diagnostico(solicitud_id):
    """{fallas, acciones_a_realizar}. Las refacciones a utilizar son los materiales
    que pidió el área en su solicitud: el mecánico no agrega ni cambia ninguno."""
    user, s, error = _servicio_del_mecanico(solicitud_id, "diagnostico")
    if error:
        return error
    data = request.get_json() or {}
    fallas = _texto(data.get("fallas"))
    acciones = _texto(data.get("acciones_a_realizar"))
    if not fallas:
        return jsonify({"msg": "Escribe el diagnóstico de fallas presentadas"}), 400
    if not acciones:
        return jsonify({"msg": "Escribe las acciones a realizar"}), 400

    # Se copian de la solicitud del área (si no tiene materiales, no hay orden de compra)
    peticion = PeticionServicio.query.filter_by(solicitud_id=s.id).first()
    piezas = [
        RefaccionServicio(cantidad=m.cantidad, unidad_medida=m.unidad_medida, concepto=m.concepto)
        for m in (peticion.materiales if peticion else [])
    ]

    s.fallas = fallas
    s.acciones_a_realizar = acciones
    s.piezas = piezas
    _registrar(s, user, "Registró el diagnóstico")
    # Los servicios anteriores ya tienen el formato de ingreso
    _avanzar(s, user, _despues_del_ingreso(s) if s.ingreso_at else "ingreso")
    db.session.commit()
    return jsonify(s.to_dict(detalle=True)), 200


# ─── 2. Formato de ingreso a taller ───
@solicitudes_bp.route("/<int:solicitud_id>/ingreso", methods=["POST"])
@role_required("mecanico")
def ingreso(solicitud_id):
    """{hoja_no, hoja_total, checklist, observaciones_ingreso}"""
    user, s, error = _servicio_del_mecanico(solicitud_id, "ingreso")
    if error:
        return error
    data = request.get_json() or {}
    if not isinstance(data.get("checklist"), dict) or not data["checklist"]:
        return jsonify({"msg": "Marca los accesorios y herramientas"}), 400
    campos = {k: data[k] for k in ("hoja_no", "hoja_total", "checklist", "total_birlos", "observaciones_ingreso") if k in data}
    error = _aplicar_campos_mecanico(s, campos)
    if error:
        return jsonify({"msg": error}), 400

    s.ingreso_at = utcnow()
    _registrar(s, user, "Registró el formato de ingreso a taller")
    _avanzar(s, user, _despues_del_ingreso(s))
    db.session.commit()
    return jsonify(s.to_dict(detalle=True)), 200


# ─── 3. Orden de compra (la manda el mecánico; la atiende administración) ───
@solicitudes_bp.route("/<int:solicitud_id>/orden-compra", methods=["POST"])
@role_required("mecanico")
def enviar_orden_compra(solicitud_id):
    """{hoja_no, hoja_total, mecanico_nombre, mecanico_firma, autoriza_nombre, autoriza_firma}
    Parque vehicular la llena con la firma del mecánico/almacén y la de quien
    autoriza (coordinador de parque vehicular)."""
    user, s, error = _servicio_del_mecanico(solicitud_id, "compra")
    if error:
        return error
    if s.orden_compra:
        return jsonify({"msg": f"La orden de compra ya se envió ({s.orden_compra.folio})"}), 409
    if not s.piezas:
        return jsonify({"msg": "Este servicio no tiene refacciones a utilizar"}), 400

    data = request.get_json() or {}
    hoja_no = _to_int(data.get("hoja_no") or 1)
    hoja_total = _to_int(data.get("hoja_total") or 1)
    if hoja_no < 1 or hoja_total < 1 or hoja_no > hoja_total or hoja_total > 99:
        return jsonify({"msg": "La hoja debe ser válida (ej. hoja 1 de 1)"}), 400
    nombre, error = validar_nombre(data.get("mecanico_nombre"), "del mecánico")
    if not error:
        firma, error = validar_firma(data.get("mecanico_firma"), "del mecánico")
    if not error:
        autoriza, error = validar_nombre(data.get("autoriza_nombre"), "de quien autoriza")
    if not error:
        firma_autoriza, error = validar_firma(data.get("autoriza_firma"), "de quien autoriza")
    if error:
        return jsonify({"msg": error}), 400

    o = OrdenCompra(
        solicitud=s, creado_por_id=user.id, hoja_no=hoja_no, hoja_total=hoja_total,
        mecanico_nombre=nombre, mecanico_firma=firma,
        autoriza_nombre=autoriza, autoriza_firma=firma_autoriza, iva_porcentaje=16,
    )
    db.session.add(o)
    db.session.flush()
    o.folio = f"OC-{o.created_at.year}-{o.id:04d}"
    _registrar(s, user, f"Envió la orden de compra {o.folio} a administración")
    db.session.commit()
    return jsonify(s.to_dict(detalle=True)), 201


# ─── 4. Formato de entrega (con la evidencia fotográfica completa) ───
@solicitudes_bp.route("/<int:solicitud_id>/entrega", methods=["POST"])
@role_required("mecanico")
def entrega(solicitud_id):
    """{acciones (trabajo realizado), observaciones, operador}. Con esto queda entregado."""
    user, s, error = _servicio_del_mecanico(solicitud_id, "reparacion")
    if error:
        return error
    tiene = {f.tipo for f in s.fotos}
    faltan = [n for t, n in TIPOS_FOTO_REQUERIDOS if t not in tiene]
    if faltan:
        return jsonify({"msg": f"Falta la foto de {', '.join(faltan)} en la evidencia fotográfica"}), 400

    data = request.get_json() or {}
    trabajo = _texto(data.get("acciones"))
    if not trabajo:
        return jsonify({"msg": "Describe el trabajo realizado"}), 400
    s.acciones = trabajo
    s.observaciones = _texto(data.get("observaciones"))
    s.operador = (_texto(data.get("operador")) or "")[:150] or None
    s.fecha_entrega = utcnow()
    _avanzar(s, user, "entregada")
    _registrar(s, user, "Llenó el formato de entrega del vehículo")
    db.session.commit()
    return jsonify(s.to_dict(detalle=True)), 200


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


# ─── Regresar un paso (solo admin, para corregir) ───
def _paso_anterior(s):
    if s.estado == "reparacion":
        return "compra" if s.orden_compra else "ingreso"
    if s.estado == "compra":
        return "ingreso"
    if s.estado == "ingreso":
        return "diagnostico"
    if s.estado == "entregada":
        return "reparacion"
    return None


@solicitudes_bp.route("/<int:solicitud_id>/estado", methods=["POST"])
@role_required("admin")
def cambiar_estado(solicitud_id):
    """{estado: <paso anterior>, nota}. Los avances los registra el mecánico en cada formato."""
    user = get_current_user()
    s = db.session.get(Solicitud, solicitud_id)
    if not s:
        return jsonify({"msg": "Solicitud no encontrada"}), 404

    data = request.get_json() or {}
    anterior = _paso_anterior(s)
    if not anterior or data.get("estado") != anterior:
        return jsonify({"msg": "Solo se puede regresar al paso anterior"}), 400

    if s.estado == "entregada":
        s.fecha_entrega = None
    if anterior == "compra" and s.orden_compra:
        # La orden vuelve a administración para corregirla
        s.orden_compra.estado = "enviada"
        s.orden_compra.atendida_at = None
    if anterior == "ingreso":
        s.ingreso_at = None
    s.estado = anterior
    _sincronizar_vehiculo(s.vehiculo)
    _registrar(s, user, f"Regresó a {ESTADO_LABEL[anterior]}", data.get("nota"))
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
    # La solicitud del área se conserva, sin el servicio que se borra
    PeticionServicio.query.filter_by(solicitud_id=s.id).update({"solicitud_id": None})
    db.session.delete(s)
    db.session.flush()

    # Si era la solicitud que tenía al vehículo en taller, se recalcula su estado
    if estaba_en_taller:
        _sincronizar_vehiculo(vehiculo)

    db.session.commit()
    return jsonify({"msg": "Solicitud eliminada"}), 200
