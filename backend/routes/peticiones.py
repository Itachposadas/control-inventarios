# backend/routes/peticiones.py
# Peticiones de servicio de las áreas.
#  - /api/area/...       cuenta del área: vehículos de SU área y enviar
#                        solicitudes para ellos (nunca ve las de otras áreas).
#  - /api/peticiones/... bandeja del taller (parque vehicular la atiende, admin consulta).
from datetime import timedelta
from flask import Blueprint, request, jsonify
from extensions import db
from models import PeticionServicio, PeticionMaterial, Vehiculo, Solicitud, utcnow, _iso
from auth_utils import role_required, get_current_user
from validacion import validar_nombre
from paginacion import pide_pagina, paginar
from vigencia import DIAS_VIGENTE, DIAS_LIMITE, vencer_si_toca, vencer_solicitudes
from routes.solicitudes import EN_TALLER, abrir_servicio

area_bp = Blueprint("area", __name__, url_prefix="/api/area")
peticiones_bp = Blueprint("peticiones", __name__, url_prefix="/api/peticiones")


def _texto(valor, largo):
    return (str(valor) if valor is not None else "").strip()[:largo] or None


# ════════════════════ CUENTA DEL ÁREA ════════════════════

@area_bp.route("/vehiculos", methods=["GET"])
@role_required("area")
def vehiculos_de_area():
    """Unidades del área de la cuenta, con lo necesario para reconocerlas."""
    area = get_current_user().area

    items = (
        Vehiculo.query
        .filter(Vehiculo.area == area, Vehiculo.estado != "baja")
        .order_by(Vehiculo.np.asc())
        .all()
    )
    ids = [v.id for v in items]
    en_taller = set()
    pendientes = {}
    if ids:
        en_taller = {
            r[0] for r in db.session.query(Solicitud.vehiculo_id)
            .filter(Solicitud.vehiculo_id.in_(ids), Solicitud.estado.in_(EN_TALLER))
        }
        # Folio de la solicitud pendiente, para explicar por qué no se puede pedir otra
        pendientes = dict(
            db.session.query(PeticionServicio.vehiculo_id, PeticionServicio.folio)
            .filter(PeticionServicio.vehiculo_id.in_(ids), PeticionServicio.estado == "pendiente")
            .all()
        )

    return jsonify([{
        "id": v.id,
        "nombre": v.numero_economico or v.unidad or v.no_inventario,
        "unidad": v.unidad,
        "marca": v.marca,
        "modelo": v.modelo,
        "placas": v.placas,
        "noInventario": v.no_inventario,
        "en_taller": v.id in en_taller,
        "peticion_pendiente": pendientes.get(v.id),  # folio o None
    } for v in items]), 200


MAX_MATERIALES = 50


def _materiales(lista, modelo=PeticionMaterial):
    """Valida una lista de {cantidad, unidad_medida, concepto}. Devuelve (registros, error).
    `modelo`: RefaccionServicio (refacciones del diagnóstico) o PeticionMaterial."""
    if not isinstance(lista, list) or not lista:
        return None, "Agrega al menos un material"
    if len(lista) > MAX_MATERIALES:
        return None, f"Máximo {MAX_MATERIALES} materiales por solicitud"

    materiales = []
    for n, m in enumerate(lista, start=1):
        if not isinstance(m, dict):
            return None, f"Material {n} inválido"
        concepto = _texto(m.get("concepto"), 255)
        unidad = _texto(m.get("unidad_medida"), 30)
        cantidad = _numero(m.get("cantidad"))
        if not concepto:
            return None, f"Material {n}: escribe el concepto"
        if not unidad:
            return None, f"Material {n}: indica la unidad de medida"
        if cantidad is None or not 0 < cantidad <= 99999:
            return None, f"Material {n}: la cantidad debe ser mayor a 0"
        materiales.append(modelo(
            concepto=concepto, unidad_medida=unidad,
            cantidad=round(cantidad, 2),  # el precio unitario lo captura el admin
        ))
    return materiales, None


def _numero(valor):
    try:
        n = float(valor)
    except (TypeError, ValueError):
        return None
    return n if n == n else None  # descarta NaN


def servicio_listo(s):
    """La reparación terminó (ya tiene la foto final) y solo falta entregar la unidad."""
    return s.estado == "reparacion" and any(f.tipo == "final" for f in s.fotos)


def _para_area(p):
    """Confirmación que recibe el área al enviar (sin datos internos del taller)."""
    d = p.to_dict()
    v = d["vehiculo"] or {}
    return {
        "id": d["id"],
        "folio": d["folio"],
        "estado": d["estado"],
        "fecha": d["fecha"],
        "area": d["area"],
        "vehiculo": {k: v.get(k) for k in ("id", "nombre", "marca", "modelo", "placas", "noInventario")},
        "materiales": [
            {k: m[k] for k in ("id", "cantidad", "unidad_medida", "concepto")} for m in d["materiales"]
        ],
        "creado_por": d["creado_por"],
        "solicitante_nombre": d["solicitante_nombre"],
        "descripcion_falla": d["descripcion_falla"],
        "motivo_descarte": d["motivo_descarte"],
        "plazo": d["plazo"],
        "atendida_at": d["atendida_at"],
        "recibida_at": d["recibida_at"],  # parque vehicular ya la atendió
        # Avance del servicio en el taller (solo etapa y fechas, sin datos internos)
        "servicio": {
            "folio": p.solicitud.folio,
            "estado": p.solicitud.estado,
            "fecha_ingreso": _iso(p.solicitud.fecha_ingreso),
            "fecha_entrega": _iso(p.solicitud.fecha_entrega),
            "listo": servicio_listo(p.solicitud),
        } if p.solicitud else None,
    }


@area_bp.route("/peticiones", methods=["GET"])
@role_required("area")
def mis_peticiones():
    """Seguimiento: solicitudes de los vehículos del área, la más reciente primero."""
    area = get_current_user().area
    items = (
        PeticionServicio.query
        .join(Vehiculo, PeticionServicio.vehiculo_id == Vehiculo.id)
        .filter(Vehiculo.area == area)
        .order_by(PeticionServicio.created_at.desc(), PeticionServicio.id.desc())
        .limit(200)
        .all()
    )
    return jsonify([_para_area(p) for p in items]), 200


@area_bp.route("/peticiones/<int:peticion_id>/formato", methods=["GET"])
@role_required("area")
def formato_peticion(peticion_id):
    """Datos de la carta de solicitud para que el área la descargue o imprima."""
    p = db.session.get(PeticionServicio, peticion_id)
    if not p or not p.vehiculo or p.vehiculo.area != get_current_user().area:
        return jsonify({"msg": "Solicitud no encontrada"}), 404
    d = _para_area(p)
    v = p.vehiculo
    d["vehiculo"].update(numeroEconomico=v.numero_economico, area=v.area, serie=v.serie, color=v.color)
    return jsonify(d), 200


@area_bp.route("/peticiones", methods=["POST"])
@role_required("area")
def crear_peticion():
    user = get_current_user()
    data = request.get_json() or {}

    vehiculo = db.session.get(Vehiculo, _to_int(data.get("vehiculo_id")))
    # Solo vehículos de su propia área
    if not vehiculo or vehiculo.estado == "baja" or vehiculo.area != user.area:
        return jsonify({"msg": "Selecciona un vehículo de tu área"}), 400

    falla = _texto(data.get("descripcion_falla"), 5000)
    if not falla or len(falla) < 10:
        return jsonify({"msg": "Describe la falla que presenta la unidad (al menos 10 caracteres)"}), 400

    solicitante, error = validar_nombre(data.get("solicitante_nombre"), "de quien solicita")
    if error:
        return jsonify({"msg": error}), 400

    en_taller = vehiculo.solicitudes.filter(Solicitud.estado.in_(EN_TALLER)).first()
    if en_taller:
        return jsonify({"msg": "Esta unidad ya tiene un servicio en proceso"}), 409
    # Una solicitud vencida ya no bloquea a la unidad
    vencer_solicitudes()
    pendiente = PeticionServicio.query.filter_by(vehiculo_id=vehiculo.id, estado="pendiente").first()
    if pendiente:
        return jsonify({"msg": f"Ya hay una solicitud pendiente para esta unidad ({pendiente.folio})"}), 409

    # Fecha, hora y área no se reciben: salen de created_at y del vehículo
    p = PeticionServicio(
        vehiculo=vehiculo, creado_por_id=user.id,
        solicitante_nombre=solicitante, descripcion_falla=falla,
    )
    db.session.add(p)
    db.session.flush()  # obtiene el id para armar el folio
    p.folio = f"PET-{p.created_at.year}-{p.id:04d}"
    db.session.commit()

    return jsonify(_para_area(p)), 201


def _to_int(valor):
    try:
        return int(valor)
    except (TypeError, ValueError):
        return 0


# ════════════════════ BANDEJA DEL TALLER ════════════════════

# Plazo de una pendiente (igual que vigencia.py y el frontend):
# vigente = menos de DIAS_VIGENTE días; por_vencer = de DIAS_VIGENTE a DIAS_LIMITE
PLAZOS = {"vigente": (0, DIAS_VIGENTE), "por_vencer": (DIAS_VIGENTE, DIAS_LIMITE)}


def _filtro_plazo(query, plazo):
    desde, hasta = PLAZOS[plazo]
    ahora = utcnow()
    return query.filter(
        PeticionServicio.created_at <= ahora - timedelta(days=desde),
        PeticionServicio.created_at > ahora - timedelta(days=hasta),
    )


@peticiones_bp.route("", methods=["GET"])
@peticiones_bp.route("/", methods=["GET"])
@role_required("admin", "mecanico")
def listar():
    """?estado=pendiente|atendida|descartada|vencida|todas &orden=antiguas|recientes
    Con ?pagina=N además: &q= (folio, vehículo, placas, solicitante, falla) &area= &plazo=vigente|por_vencer
    y responde {items, total, pagina, paginas, conteo, areas}."""
    estado = (request.args.get("estado") or "pendiente").strip()
    # Pendientes: las que llevan más tiempo esperando van primero (son prioridad)
    orden = (request.args.get("orden") or ("antiguas" if estado == "pendiente" else "recientes")).strip()
    query = PeticionServicio.query.join(Vehiculo, PeticionServicio.vehiculo_id == Vehiculo.id)
    if estado != "todas":
        query = query.filter(PeticionServicio.estado == estado)
    if orden == "antiguas":
        query = query.order_by(PeticionServicio.created_at.asc(), PeticionServicio.id.asc())
    else:
        query = query.order_by(PeticionServicio.created_at.desc(), PeticionServicio.id.desc())

    if not pide_pagina():
        return jsonify([p.to_dict() for p in query.limit(200).all()]), 200

    # Áreas que tienen solicitudes en esta pestaña (para el filtro)
    areas = sorted({a for (a,) in query.order_by(None).with_entities(Vehiculo.area).distinct() if a})

    area = (request.args.get("area") or "").strip()
    q = (request.args.get("q") or "").strip()
    if area:
        query = query.filter(Vehiculo.area == area)
    if q:
        like = f"%{q}%"
        query = query.filter(db.or_(
            PeticionServicio.folio.like(like), PeticionServicio.solicitante_nombre.like(like),
            PeticionServicio.descripcion_falla.like(like),
            Vehiculo.numero_economico.like(like), Vehiculo.unidad.like(like),
            Vehiculo.placas.like(like), Vehiculo.no_inventario.like(like),
        ))

    # Cuántas hay de cada plazo (solo pendientes), antes de filtrar por plazo
    conteo = None
    if estado == "pendiente":
        conteo = {"todas": query.order_by(None).count()}
        for nombre in PLAZOS:
            conteo[nombre] = _filtro_plazo(query, nombre).order_by(None).count()
        plazo = (request.args.get("plazo") or "").strip()
        if plazo in PLAZOS:
            query = _filtro_plazo(query, plazo)

    items, info = paginar(query, por_defecto=10)
    return jsonify({**info, "items": [p.to_dict() for p in items], "conteo": conteo, "areas": areas}), 200


@peticiones_bp.route("/<int:peticion_id>", methods=["GET"])
@role_required("admin", "mecanico")
def obtener(peticion_id):
    p = db.session.get(PeticionServicio, peticion_id)
    if not p:
        return jsonify({"msg": "Solicitud no encontrada"}), 404
    return jsonify(p.to_dict()), 200


@peticiones_bp.route("/<int:peticion_id>/recibir", methods=["POST"])
@role_required("mecanico")
def recibir(peticion_id):
    """"Atender": parque vehicular recibe la solicitud y se abre el servicio (paso Diagnóstico)."""
    user = get_current_user()
    p = db.session.get(PeticionServicio, peticion_id)
    if not p:
        return jsonify({"msg": "Solicitud no encontrada"}), 404
    if vencer_si_toca(p):
        db.session.commit()
    if p.estado != "pendiente":
        return jsonify({"msg": _ya_no_pendiente(p)}), 409

    if not p.recibida_at:
        p.recibida_at = utcnow()

    s, error = abrir_servicio(p, user)
    if error:
        db.session.rollback()
        return jsonify({"msg": error[0]}), error[1]
    p.estado = "atendida"
    p.solicitud = s
    p.atendida_por_id = user.id
    p.atendida_at = p.recibida_at
    db.session.commit()
    return jsonify(p.to_dict()), 200


def _ya_no_pendiente(p):
    if p.estado == "vencida":
        return (f"Esta solicitud venció: pasaron más de {DIAS_LIMITE} días sin que llegara la unidad. "
                "El área debe enviar una nueva solicitud.")
    if p.estado == "descartada":
        return "Esta solicitud ya fue descartada"
    return "Esta solicitud ya fue atendida"


@peticiones_bp.route("/<int:peticion_id>/descartar", methods=["POST"])
@role_required("mecanico")
def descartar(peticion_id):
    user = get_current_user()
    p = db.session.get(PeticionServicio, peticion_id)
    if not p:
        return jsonify({"msg": "Solicitud no encontrada"}), 404
    if vencer_si_toca(p):
        db.session.commit()
    if p.estado != "pendiente":
        return jsonify({"msg": _ya_no_pendiente(p)}), 409

    motivo = _texto((request.get_json() or {}).get("motivo"), 1000)
    if not motivo:
        return jsonify({"msg": "Escribe el motivo"}), 400

    p.estado = "descartada"
    p.motivo_descarte = motivo
    p.atendida_por_id = user.id
    p.atendida_at = utcnow()
    db.session.commit()
    return jsonify(p.to_dict()), 200
