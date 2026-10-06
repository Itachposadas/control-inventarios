# backend/routes/peticiones.py
# Peticiones de servicio de las áreas.
#  - /api/area/...       cuenta del área: vehículos de SU área y enviar
#                        solicitudes para ellos (nunca ve las de otras áreas).
#  - /api/peticiones/... bandeja del taller (mecánico la atiende, admin consulta).
from flask import Blueprint, request, jsonify
from extensions import db
from models import PeticionServicio, PeticionMaterial, Vehiculo, Solicitud, utcnow
from auth_utils import role_required, get_current_user
from routes.solicitudes import EN_TALLER

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


def _materiales(lista):
    """Valida los materiales capturados. Devuelve (materiales, error)."""
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
        precio = _numero(m.get("precio_unitario"))
        if not concepto:
            return None, f"Material {n}: escribe el concepto"
        if not unidad:
            return None, f"Material {n}: indica la unidad de medida"
        if cantidad is None or not 0 < cantidad <= 99999:
            return None, f"Material {n}: la cantidad debe ser mayor a 0"
        if precio is None or not 0 <= precio <= 9999999:
            return None, f"Material {n}: el precio unitario no es válido"
        materiales.append(PeticionMaterial(
            concepto=concepto, unidad_medida=unidad,
            cantidad=round(cantidad, 2), precio_unitario=round(precio, 2),
        ))
    return materiales, None


def _numero(valor):
    try:
        n = float(valor)
    except (TypeError, ValueError):
        return None
    return n if n == n else None  # descarta NaN


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
        "materiales": d["materiales"],
        "total": d["total"],
        "creado_por": d["creado_por"],
        "motivo_descarte": d["motivo_descarte"],
        "atendida_at": d["atendida_at"],
    }


@area_bp.route("/peticiones", methods=["POST"])
@role_required("area")
def crear_peticion():
    user = get_current_user()
    data = request.get_json() or {}

    vehiculo = db.session.get(Vehiculo, _to_int(data.get("vehiculo_id")))
    # Solo vehículos de su propia área
    if not vehiculo or vehiculo.estado == "baja" or vehiculo.area != user.area:
        return jsonify({"msg": "Selecciona un vehículo de tu área"}), 400

    materiales, error = _materiales(data.get("materiales"))
    if error:
        return jsonify({"msg": error}), 400

    en_taller = vehiculo.solicitudes.filter(Solicitud.estado.in_(EN_TALLER)).first()
    if en_taller:
        return jsonify({"msg": "Esta unidad ya está en el taller"}), 409
    pendiente = PeticionServicio.query.filter_by(vehiculo_id=vehiculo.id, estado="pendiente").first()
    if pendiente:
        return jsonify({"msg": f"Ya hay una solicitud pendiente para esta unidad ({pendiente.folio})"}), 409

    # Fecha, hora y área no se reciben: salen de created_at y del vehículo
    p = PeticionServicio(vehiculo=vehiculo, materiales=materiales, creado_por_id=user.id)
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

@peticiones_bp.route("", methods=["GET"])
@peticiones_bp.route("/", methods=["GET"])
@role_required("admin", "mecanico")
def listar():
    estado = (request.args.get("estado") or "pendiente").strip()
    # Pendientes: las que llevan más tiempo esperando van primero (son prioridad)
    orden = (request.args.get("orden") or ("antiguas" if estado == "pendiente" else "recientes")).strip()
    query = PeticionServicio.query
    if estado != "todas":
        query = query.filter(PeticionServicio.estado == estado)
    if orden == "antiguas":
        query = query.order_by(PeticionServicio.created_at.asc(), PeticionServicio.id.asc())
    else:
        query = query.order_by(PeticionServicio.created_at.desc(), PeticionServicio.id.desc())
    items = query.limit(200).all()
    return jsonify([p.to_dict() for p in items]), 200


@peticiones_bp.route("/<int:peticion_id>", methods=["GET"])
@role_required("admin", "mecanico")
def obtener(peticion_id):
    p = db.session.get(PeticionServicio, peticion_id)
    if not p:
        return jsonify({"msg": "Solicitud no encontrada"}), 404
    return jsonify(p.to_dict()), 200


@peticiones_bp.route("/<int:peticion_id>/descartar", methods=["POST"])
@role_required("mecanico")
def descartar(peticion_id):
    user = get_current_user()
    p = db.session.get(PeticionServicio, peticion_id)
    if not p:
        return jsonify({"msg": "Solicitud no encontrada"}), 404
    if p.estado != "pendiente":
        return jsonify({"msg": "Esta solicitud ya fue atendida"}), 409

    motivo = _texto((request.get_json() or {}).get("motivo"), 1000)
    if not motivo:
        return jsonify({"msg": "Escribe el motivo"}), 400

    p.estado = "descartada"
    p.motivo_descarte = motivo
    p.atendida_por_id = user.id
    p.atendida_at = utcnow()
    db.session.commit()
    return jsonify(p.to_dict()), 200
