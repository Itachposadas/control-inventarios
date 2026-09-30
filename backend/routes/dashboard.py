# backend/routes/dashboard.py
import re
from collections import Counter
from flask import Blueprint, jsonify
from sqlalchemy import func
from extensions import db
from models import Vehiculo, Solicitud, SolicitudEvento
from auth_utils import role_required

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")

# Un año de 4 dígitos (1900–2099) en cualquier parte del texto del modelo
ANIO_RE = re.compile(r"\b(19\d{2}|20\d{2})\b")


def _anio_de_modelo(modelo):
    """'2019' → '2019'; 'SPORT TSMAN 570 2026' → '2026'; '924F' o vacío → None."""
    m = ANIO_RE.search(modelo or "")
    return m.group(1) if m else None


@dashboard_bp.route("/stats", methods=["GET"])
@role_required()
def stats():
    """
    Devuelve KPIs, datos para gráficas y actividad reciente del panel de control.
    """
    # ─── KPIs de vehículos ───
    total_vehiculos = Vehiculo.query.count()

    por_estado = dict(
        db.session.query(Vehiculo.estado, func.count(Vehiculo.id))
        .group_by(Vehiculo.estado)
        .all()
    )

    activos = por_estado.get("activo", 0)
    mantenimiento = por_estado.get("mantenimiento", 0)
    baja = por_estado.get("baja", 0)

    # ─── Top áreas (para gráfica de barras o tabla) ───
    top_areas = (
        db.session.query(Vehiculo.area, func.count(Vehiculo.id).label("total"))
        .group_by(Vehiculo.area)
        .order_by(func.count(Vehiculo.id).desc())
        .limit(8)
        .all()
    )

    # ─── Marca más común ───
    top_marcas = (
        db.session.query(Vehiculo.marca, func.count(Vehiculo.id).label("total"))
        .filter(Vehiculo.marca.isnot(None), Vehiculo.marca != "")
        .group_by(Vehiculo.marca)
        .order_by(func.count(Vehiculo.id).desc())
        .limit(5)
        .all()
    )

    # ─── Años (para gráfica de líneas) ───
    # Se cuentan TODOS los vehículos: los que no tienen un año válido en
    # "modelo" (vacío o un texto como "924F") van aparte en sin_anio.
    conteo_anios = Counter()
    sin_anio = 0
    for modelo, total in (
        db.session.query(Vehiculo.modelo, func.count(Vehiculo.id))
        .group_by(Vehiculo.modelo)
        .all()
    ):
        anio = _anio_de_modelo(modelo)
        if anio:
            conteo_anios[anio] += total
        else:
            sin_anio += total
    por_anio = sorted(conteo_anios.items())

    # ─── Vehículos por área (para dona) ───
    vehiculos_por_area = (
        db.session.query(Vehiculo.area, func.count(Vehiculo.id).label("total"))
        .group_by(Vehiculo.area)
        .order_by(func.count(Vehiculo.id).desc())
        .all()
    )

    # ─── Solicitudes ───
    solicitudes_abiertas = Solicitud.query.filter(Solicitud.estado != "entregada").count()
    en_reparacion = Solicitud.query.filter(Solicitud.estado == "reparacion").count()
    por_entregar = Solicitud.query.filter(Solicitud.estado == "completada").count()

    # ─── Actividad reciente (bitácora de solicitudes) ───
    eventos = (
        SolicitudEvento.query
        .order_by(SolicitudEvento.created_at.desc(), SolicitudEvento.id.desc())
        .limit(6)
        .all()
    )

    return jsonify({
        "kpis": {
            "total_vehiculos": total_vehiculos,
            "activos": activos,
            "en_mantenimiento": mantenimiento,
            "baja": baja,
            "solicitudes_abiertas": solicitudes_abiertas,
            "en_reparacion": en_reparacion,
            "por_entregar": por_entregar,
        },
        "actividad": [
            {**e.to_dict(), "folio": e.solicitud.folio, "solicitud_id": e.solicitud_id}
            for e in eventos
        ],
        "top_areas": [
            {"area": a, "total": t} for a, t in top_areas
        ],
        "top_marcas": [
            {"marca": m, "total": t} for m, t in top_marcas
        ],
        "sin_anio": sin_anio,
        "por_anio": [
            {"anio": a, "total": t} for a, t in por_anio
        ],
        "vehiculos_por_area": [
            {"area": a, "total": t} for a, t in vehiculos_por_area
        ],
    }), 200