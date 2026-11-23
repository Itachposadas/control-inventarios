# backend/routes/coordinacion.py
# Titular de la Coordinación de Parque Vehicular: a quien van dirigidas las
# solicitudes y quien "autoriza" en los formatos PDF. Todos lo consultan;
# solo administración registra un cambio de titular o corrige el nombre.
from datetime import date
from flask import Blueprint, request, jsonify
from auth_utils import role_required, get_current_user
from extensions import db
from models import TitularCoordinacion, ROLES
from validacion import una_linea, validar_nombre

coordinacion_bp = Blueprint("coordinacion", __name__, url_prefix="/api/coordinacion")

# Titular con el que arrancó el sistema (antes estaba escrito en el código)
TITULAR_INICIAL = ("C. Tiburcio Monroy Yáñez", "Coordinador de Parque Vehicular")
CARGO_DEFAULT = TITULAR_INICIAL[1]


def cargar_titular_inicial(app):
    """La primera vez deja registrado al titular original (sin fecha = desde el inicio)."""
    if TitularCoordinacion.query.first():
        return
    nombre, cargo = TITULAR_INICIAL
    db.session.add(TitularCoordinacion(nombre=nombre, cargo=cargo, desde=None))
    db.session.commit()
    app.logger.info("Titular de la coordinación registrado: %s", nombre)


def _ordenados():
    # El primero (sin fecha) va antes que todos; después, por fecha y por orden de captura
    return (
        TitularCoordinacion.query
        .order_by(TitularCoordinacion.desde.is_(None).desc(),
                  TitularCoordinacion.desde.asc(),
                  TitularCoordinacion.id.asc())
        .all()
    )


def _leer_datos(data):
    """(nombre, cargo, error) del formulario."""
    nombre, error = validar_nombre(data.get("nombre"), "del titular")
    if error:
        return None, None, error
    cargo = una_linea(data.get("cargo")) or CARGO_DEFAULT
    if len(cargo) > 120:
        return None, None, "El cargo es demasiado largo (máximo 120 caracteres)"
    return nombre, cargo, None


# ─── Historial de titulares (el último es el actual) ───
@coordinacion_bp.route("/titulares", methods=["GET"])
@role_required(*ROLES)
def listar():
    return jsonify([t.to_dict() for t in _ordenados()]), 200


# ─── Registrar cambio de titular ───
@coordinacion_bp.route("/titulares", methods=["POST"])
@role_required("admin")
def registrar():
    data = request.get_json() or {}
    nombre, cargo, error = _leer_datos(data)
    if error:
        return jsonify({"msg": error}), 400

    try:
        desde = date.fromisoformat(str(data.get("desde") or ""))
    except ValueError:
        return jsonify({"msg": "Indica desde qué fecha está a cargo"}), 400

    titulares = _ordenados()
    actual = titulares[-1] if titulares else None
    if actual and actual.desde and desde <= actual.desde:
        return jsonify({
            "msg": f"La fecha debe ser posterior al {actual.desde.strftime('%d/%m/%Y')}, "
                   "cuando entró el titular actual",
        }), 400
    if actual and actual.nombre.lower() == nombre.lower() and actual.cargo.lower() == cargo.lower():
        return jsonify({"msg": "Esa persona ya es el titular actual"}), 409

    t = TitularCoordinacion(nombre=nombre, cargo=cargo, desde=desde,
                            registrado_por_id=get_current_user().id)
    db.session.add(t)
    db.session.commit()
    return jsonify(t.to_dict()), 201


# ─── Corregir nombre o cargo (ej. un error de escritura) ───
@coordinacion_bp.route("/titulares/<int:tid>", methods=["PUT"])
@role_required("admin")
def corregir(tid):
    t = db.session.get(TitularCoordinacion, tid)
    if not t:
        return jsonify({"msg": "No se encontró el titular"}), 404
    nombre, cargo, error = _leer_datos(request.get_json() or {})
    if error:
        return jsonify({"msg": error}), 400
    t.nombre, t.cargo = nombre, cargo
    db.session.commit()
    return jsonify(t.to_dict()), 200


# ─── Deshacer el último cambio (si se registró por error) ───
@coordinacion_bp.route("/titulares/<int:tid>", methods=["DELETE"])
@role_required("admin")
def deshacer(tid):
    titulares = _ordenados()
    if len(titulares) < 2 or titulares[-1].id != tid:
        return jsonify({"msg": "Solo se puede deshacer el último cambio de titular"}), 400
    db.session.delete(titulares[-1])
    db.session.commit()
    return jsonify({"msg": "Cambio deshecho"}), 200
