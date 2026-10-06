# backend/routes/general.py
# Buscador global y notificaciones (campana) de la barra superior.
from flask import Blueprint, request, jsonify
from extensions import db
from models import Vehiculo, Solicitud, SolicitudEvento
from auth_utils import role_required, get_current_user
from routes.solicitudes import EN_TALLER

general_bp = Blueprint("general", __name__, url_prefix="/api")

LIMITE = 6


def _nombre_vehiculo(v):
    return v.numero_economico or v.unidad or v.no_inventario


# ─── Buscador global ───
@general_bp.route("/buscar", methods=["GET"])
@role_required()
def buscar():
    q = (request.args.get("q") or "").strip()
    if len(q) < 2:
        return jsonify({"vehiculos": [], "solicitudes": []}), 200

    like = f"%{q}%"
    user = get_current_user()

    # El catálogo de vehículos es solo del admin
    vehiculos = [] if user.role != "admin" else (
        Vehiculo.query
        .filter(db.or_(
            Vehiculo.no_inventario.like(like),
            Vehiculo.numero_economico.like(like),
            Vehiculo.placas.like(like),
            Vehiculo.unidad.like(like),
            Vehiculo.serie.like(like),
        ))
        .order_by(Vehiculo.np.asc())
        .limit(LIMITE)
        .all()
    )

    solicitudes = (
        Solicitud.query.join(Vehiculo)
        .filter(db.or_(
            Solicitud.folio.like(like),
            Solicitud.ing_placas.like(like),
        ))
        .order_by(Solicitud.fecha_ingreso.desc())
        .limit(LIMITE)
        .all()
    )

    return jsonify({
        "vehiculos": [
            {
                "id": v.id,
                "nombre": _nombre_vehiculo(v),
                "detalle": " · ".join(filter(None, [v.no_inventario, v.placas, v.area])),
                "estado": v.estado,
            }
            for v in vehiculos
        ],
        "solicitudes": [
            {
                "id": s.id,
                "folio": s.folio,
                "vehiculo": _nombre_vehiculo(s.vehiculo),
                "estado": s.estado,
            }
            for s in solicitudes
        ],
    }), 200


# ─── Notificaciones (pendientes según el rol) ───
@general_bp.route("/notificaciones", methods=["GET"])
@role_required()
def notificaciones():
    user = get_current_user()
    items = []

    if user.role == "admin":
        # Servicios que el mecánico ya terminó: falta costo y entrega
        pendientes = (
            Solicitud.query.filter(Solicitud.estado == "completada")
            .order_by(Solicitud.updated_at.desc())
            .all()
        )
        for s in pendientes:
            items.append({
                "id": f"entregar-{s.id}",
                "tipo": "entregar",
                "titulo": "Listo para entregar",
                "texto": f"{s.folio} · {_nombre_vehiculo(s.vehiculo)}",
                "solicitud_id": s.id,
                "fecha": s.updated_at.isoformat() if s.updated_at else None,
            })
    else:
        # Servicios del mecánico que siguen en el taller
        activos = (
            Solicitud.query.filter(
                Solicitud.mecanico_id == user.id,
                Solicitud.estado.in_(EN_TALLER),
            )
            .order_by(Solicitud.updated_at.desc())
            .all()
        )
        for s in activos:
            # ¿El admin se la asignó a este mecánico? (no la registró él)
            reasignada = (
                s.creado_por_id != user.id
                and SolicitudEvento.query.filter(
                    SolicitudEvento.solicitud_id == s.id,
                    SolicitudEvento.accion.like("Asignó a%"),
                ).first() is not None
            )
            items.append({
                "id": f"taller-{s.id}",
                "tipo": "reasignada" if reasignada else "en_taller",
                "titulo": "Te asignaron este servicio" if reasignada else "Servicio en proceso",
                "texto": f"{s.folio} · {_nombre_vehiculo(s.vehiculo)}",
                "solicitud_id": s.id,
                "estado": s.estado,
                "fecha": s.updated_at.isoformat() if s.updated_at else None,
            })

    return jsonify({"total": len(items), "items": items}), 200
